import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { GLOBAL_REGIONS_TYPE } from '../mergeGlobals.js';
import {
  toPuckDocument,
  type WidgetInstanceLike,
  type WidgetPlacementLike
} from './widgetsToPuckDocument.js';

/**
 * Backfill `puck_document` from the live widget tables.
 *
 * Read-only with respect to `widget_instance` / `widget_placement` — they
 * remain the source of truth until the cutover, and are only dropped a full
 * release later. This just materializes an equivalent document per
 * (theme, route, scope) so the Puck render path has something to read and so
 * the conversion can be inspected long before anything depends on it.
 *
 * Safe to re-run: each document is upserted on `puck_document_unique`, the
 * same constraint `applyOperationToSource` targets.
 */

/** The widget model's "every route" marker; becomes the globals document. */
const GLOBAL_ROUTE = 'all';

export interface BackfillReport {
  documents: {
    route: string;
    scopeUrn: string | null;
    theme: string | null;
    componentCount: number;
  }[];
  /**
   * Placements the converter could not attach, with why. These are the rows a
   * human needs to look at — see `toPuckDocument` for the two causes. An empty
   * array here is the migration's green light.
   */
  orphaned: {
    route: string;
    scopeUrn: string | null;
    theme: string | null;
    placementUuid: string;
    area: string;
    reason: 'unresolved-parent' | 'too-deep';
  }[];
}

interface GroupRow {
  theme: string | null;
  route: string;
  entity_urn: string | null;
}

/**
 * @param areaId  Top-level area to take as the document body. Every RRv7
 *                route mounts exactly one `WidgetArea areaId="content"`, so
 *                widgets in any other area (legacy `headerTop` and friends)
 *                are intentionally not part of a document.
 * @param includeDeep  Include nodes nested deeper than the storefront can
 *                currently render. Off by default: those exist in the DB but
 *                have never been displayed, and a storage migration must not
 *                make content appear as a side effect.
 */
export async function backfillPuckDocuments(
  client: Pool | PoolClient,
  opts: { areaId?: string; includeDeep?: boolean; dryRun?: boolean } = {}
): Promise<BackfillReport> {
  const areaId = opts.areaId ?? 'content';
  const report: BackfillReport = { documents: [], orphaned: [] };

  // One document per distinct (theme, route, scope). NULLs are significant on
  // both theme and entity_urn — they mean "no custom theme" and "route-level"
  // respectively — so they are grouped as-is, not coalesced away.
  const groups = await client.query<GroupRow>(
    `SELECT DISTINCT theme, route, entity_urn FROM widget_placement ORDER BY route`
  );

  for (const g of groups.rows) {
    // Load this group's placements plus the instances they reference. Both
    // predicates use IS NOT DISTINCT FROM so the NULL buckets compare equal —
    // a plain `=` silently returns nothing for route-level rows.
    const placements = await client.query<WidgetPlacementLike>(
      `SELECT p.uuid::text AS uuid,
              wi.uuid::text AS widget_instance_uuid,
              p.area,
              p.sort_order
       FROM widget_placement p
       INNER JOIN widget_instance wi ON wi.widget_instance_id = p.widget_instance_id
       WHERE p.route = $1
         AND p.entity_urn IS NOT DISTINCT FROM $2
         AND p.theme IS NOT DISTINCT FROM $3`,
      [g.route, g.entity_urn, g.theme]
    );

    const instances = await client.query<WidgetInstanceLike>(
      `SELECT DISTINCT wi.uuid::text AS uuid, wi.type, wi.settings
       FROM widget_instance wi
       INNER JOIN widget_placement p ON p.widget_instance_id = wi.widget_instance_id
       WHERE p.route = $1
         AND p.entity_urn IS NOT DISTINCT FROM $2
         AND p.theme IS NOT DISTINCT FROM $3`,
      [g.route, g.entity_urn, g.theme]
    );

    // `data` is reassigned below for the globals group; `orphaned` is not.
    let { data, orphaned } = toPuckDocument(instances.rows, placements.rows, {
      areaId,
      includeDeep: opts.includeDeep
    });

    for (const o of orphaned) {
      report.orphaned.push({
        route: g.route,
        scopeUrn: g.entity_urn,
        theme: g.theme,
        ...o
      });
    }

    // A group whose placements are all in some other area produces an empty
    // document. Skip rather than writing a blank row that would later read as
    // "this route was deliberately cleared".
    if (data.content.length === 0) continue;

    /**
     * `all` is the widget model's "every route". The document model expresses
     * that as a `global_regions` container whose two slots the render path
     * splices around each route's own content, so converted globals go into
     * the "before" region — matching the widget model, where a global with a
     * low `sort_order` rendered above the page's own content.
     *
     * Ordering within the region is preserved; interleaving with a route's
     * content by `sort_order` is not, because documents have no sort_order.
     * That divergence is the accepted cost recorded in the cutover plan.
     */
    if (g.route === GLOBAL_ROUTE) {
      data = {
        ...data,
        content: [
          {
            type: GLOBAL_REGIONS_TYPE,
            props: { id: randomUUID(), before: data.content, after: [] }
          }
        ]
      };
    }

    report.documents.push({
      route: g.route,
      scopeUrn: g.entity_urn,
      theme: g.theme,
      componentCount: data.content.length
    });



    if (opts.dryRun) continue;

    await client.query(
      `INSERT INTO puck_document (route, scope_urn, theme, data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (route, COALESCE(scope_urn, ''), COALESCE(theme, ''))
       DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [g.route, g.entity_urn, g.theme, JSON.stringify(data)]
    );
  }

  return report;
}
