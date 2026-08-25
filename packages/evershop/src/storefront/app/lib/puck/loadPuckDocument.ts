import { pool } from '../../../../lib/postgres/connection.js';
import { getActiveTheme } from '../../../../lib/util/getActiveTheme.js';

/**
 * Load the published Puck document for a route (and optional entity scope).
 *
 * Server-only. Mirrors the theme predicate the widget path uses
 * (`loadWidgetInstances.js`, `Widget.resolvers.js`): NULL is a real bucket
 * meaning "no custom theme", so the comparison is `IS NOT DISTINCT FROM` —
 * a plain `=` silently returns nothing for exactly the rows a store without a
 * custom theme has.
 *
 * Returns null when no document exists, which is the normal case for every
 * route until the backfill has run for it. Callers fall back to the widget
 * pipeline rather than rendering a blank page.
 *
 * Changeset overlay is deliberately NOT applied here — Phase 2 renders the
 * published state only. Preview/rollout overlay arrives with
 * `applyOverlayToDocuments` when the editor lands.
 */
export interface PuckDocumentData {
  content: unknown[];
  root: { props: Record<string, unknown> };
}

export async function loadPuckDocument(
  route: string,
  scopeUrn: string | null = null
): Promise<PuckDocumentData | null> {
  const { rows } = await pool.query<{ data: PuckDocumentData }>(
    `SELECT data FROM puck_document
      WHERE route = $1
        AND scope_urn IS NOT DISTINCT FROM $2
        AND theme IS NOT DISTINCT FROM $3
      LIMIT 1`,
    [route, scopeUrn, getActiveTheme()]
  );
  return rows[0]?.data ?? null;
}
