import type { Pool } from 'pg';
import { rowToDefinition } from '../metafield/definition.js';
import {
  provisioningAvailable,
  sanitizeForManifest
} from '../metafield/provision.js';
import type { ManifestMetafieldDefinition } from '../metafield/provision.js';
import type { Manifest, PlacementRecord, WidgetRecord } from './manifest.js';

export interface ExportOpts {
  themeId: string;
  pool: Pool;
  /** SemVer `version` to stamp into the exported theme.json. */
  version: string;
  /** Preserve the existing theme.json's `theme_name` when re-exporting. */
  preserveThemeName?: string;
}

/**
 * Serialize a theme's live content (active widgets + their placements) into a
 * manifest (spec 04 § 6.4 / § 6.5).
 *
 * UUIDs are read straight from the DB and NEVER regenerated — that stability
 * is the whole contract that lets buyers' customizations survive upgrades.
 * Only `status = TRUE` rows are exported: a widget the author disabled in the
 * page-builder is not part of the shipped theme.
 */
export async function exportToManifest(opts: ExportOpts): Promise<Manifest> {
  const widgetRows = await opts.pool.query<{
    uuid: string;
    type: string;
    name: string;
    settings: Record<string, unknown> | null;
  }>(
    `SELECT uuid::text AS uuid, type, name, settings
     FROM widget_instance
     WHERE theme IS NOT DISTINCT FROM $1 AND status = TRUE
     ORDER BY uuid`,
    [opts.themeId]
  );

  const placementRows = await opts.pool.query<{
    uuid: string;
    widget_instance_uuid: string;
    route: string;
    area: string;
    sort_order: number;
  }>(
    `SELECT p.uuid::text AS uuid,
            wi.uuid::text AS widget_instance_uuid,
            p.route, p.area, p.sort_order
     FROM widget_placement p
     INNER JOIN widget_instance wi ON wi.widget_instance_id = p.widget_instance_id
     WHERE p.theme IS NOT DISTINCT FROM $1 AND wi.status = TRUE
     ORDER BY p.uuid`,
    [opts.themeId]
  );

  const widgets: WidgetRecord[] = widgetRows.rows.map((r) => ({
    uuid: r.uuid,
    type: r.type,
    name: r.name,
    settings: r.settings ?? {}
  }));
  const placements: PlacementRecord[] = placementRows.rows.map((r) => ({
    uuid: r.uuid,
    widget_instance_uuid: r.widget_instance_uuid,
    route: r.route,
    area: r.area,
    sort_order: Number(r.sort_order)
  }));

  // Metafield definitions this theme provisioned — manifest-declared AND
  // lazily created via the page-builder drawer (exporting both keeps the next
  // merchant's install from missing fields the theme renders). Keyed by
  // provenance, not namespace: namespaces are a convention, provenance is the
  // mechanism. Guarded for unmigrated DBs.
  const metafieldDefinitions: ManifestMetafieldDefinition[] = [];
  if (await provisioningAvailable(opts.pool)) {
    const defRows = await opts.pool.query(
      `SELECT d.*
         FROM metafield_definition d
        WHERE d.provisioned_by_theme = $1
        ORDER BY d.owner_type, d.namespace, d.field_key`,
      [opts.themeId]
    );
    for (const r of defRows.rows) {
      // The admin REST surface accepts unconstrained validations/subFields;
      // sanitize to the strict manifest shape so the exported theme.json can
      // never fail its own validation and block activation. Definitions that
      // cannot be expressed in the manifest schema are skipped.
      const entry = sanitizeForManifest(rowToDefinition(r));
      if (entry) metafieldDefinitions.push(entry);
    }
  }

  /**
   * Documents are the schema-2 content, exported straight from the table the
   * storefront reads.
   *
   * The widget arrays are still emitted alongside them. During the migration
   * both models are live — the legacy pipeline still serves routes that have
   * not cut over — and an export that dropped one of them would produce a
   * theme that installs into only half the store. They go away together at
   * cutover, when the widget tables do.
   */
  const documentRows = await opts.pool.query<{
    route: string;
    scope_urn: string | null;
    data: unknown;
  }>(
    `SELECT route, scope_urn, data
     FROM puck_document
     WHERE theme IS NOT DISTINCT FROM $1
     ORDER BY route, COALESCE(scope_urn, '')`,
    [opts.themeId]
  );

  const documents = documentRows.rows.map((r) => ({
    route: r.route,
    scope_urn: r.scope_urn,
    data: r.data
  }));

  return {
    theme_name: opts.preserveThemeName ?? opts.themeId,
    version: opts.version,
    // Explicit, so a re-exported theme declares its schema rather than
    // relying on inference from the presence of `documents`.
    schema: 2 as const,
    widgets,
    placements,
    documents,
    ...(metafieldDefinitions.length > 0 ? { metafieldDefinitions } : {})
  };
}
