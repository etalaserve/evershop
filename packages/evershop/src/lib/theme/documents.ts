import { randomUUID } from 'node:crypto';
import { toPuckDocument } from '../puck/convert/widgetsToPuckDocument.js';
import type { DocumentRecord, Manifest } from './manifest.js';
import { manifestSchema } from './manifest.js';

/**
 * Reduce any theme manifest to the documents it installs.
 *
 * Both schemas end here, which is the point: there is ONE install path to
 * keep correct rather than a widget path and a document path drifting apart.
 *
 * A schema-1 manifest is converted rather than written as widget rows. That
 * keeps every previously published theme installable — a theme is an artefact
 * someone else shipped, and we do not get to expire it — while producing
 * exactly the content model the storefront now reads. It reuses the same
 * converter the data migration uses, so a theme and a live store convert
 * identically; if the converter is wrong, it is wrong in one place.
 */
export interface ThemeDocuments {
  documents: DocumentRecord[];
  /**
   * Placements the converter could not attach, for schema-1 manifests.
   *
   * Surfaced rather than swallowed: a theme whose content silently lost a
   * nested widget on install would look installed and be wrong, and the
   * merchant has no way to know what was supposed to be there.
   */
  orphaned: { area: string; reason: string }[];
}

export function manifestDocuments(
  manifest: Manifest,
  opts: { areaId?: string } = {}
): ThemeDocuments {
  if (manifestSchema(manifest) === 2) {
    return { documents: manifest.documents ?? [], orphaned: [] };
  }

  const widgets = manifest.widgets ?? [];
  const placements = manifest.placements ?? [];
  if (placements.length === 0) return { documents: [], orphaned: [] };

  const areaId = opts.areaId ?? 'content';
  const orphaned: ThemeDocuments['orphaned'] = [];
  const documents: DocumentRecord[] = [];

  // One document per route the manifest places into. A theme never carried
  // entity scope — `widget_placement.entity_urn` is set by merchants, not by
  // manifests — so every converted document is the route default.
  const routes = [...new Set(placements.map((p) => p.route))];

  for (const route of routes) {
    const routePlacements = placements
      .filter((p) => p.route === route)
      .map((p) => ({
        uuid: p.uuid,
        widget_instance_uuid: p.widget_instance_uuid,
        area: p.area,
        sort_order: p.sort_order
      }));

    const { data, orphaned: dropped } = toPuckDocument(
      widgets.map((w) => ({
        // The converter keys components on the instance uuid, which is what
        // makes extras lookups and external references survive conversion.
        uuid: w.uuid,
        type: w.type,
        settings: (w.settings ?? {}) as Record<string, unknown>
      })),
      routePlacements,
      { areaId }
    );

    for (const o of dropped) orphaned.push({ area: o.area, reason: o.reason });
    if (data.content.length === 0) continue;

    documents.push({ route, scope_urn: null, data });
  }

  return { documents, orphaned };
}

/** A fresh uuid per installed document; themes do not carry document identity. */
export function newDocumentUuid(): string {
  return randomUUID();
}
