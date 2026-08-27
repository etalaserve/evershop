import { pool } from '../../../../lib/postgres/connection.js';
import { getActiveTheme } from '../../../../lib/util/getActiveTheme.js';
import { loadActiveOps } from '../../../../modules/pageBuilder/services/loadActiveOps.js';
import {
  applyOverlayToDocuments,
  type OverlayDocument
} from '../../../../modules/pageBuilder/services/applyOverlayToDocuments.js';
import type { PuckDocumentData } from '~/lib/puck/loadPuckDocument.js';

const EMPTY: PuckDocumentData = { content: [], root: { props: {} } };

/**
 * Load a route's Puck document with a changeset's staged edits applied.
 *
 * This is the editor's read path, and the counterpart to `loadPuckDocument`
 * (which reads published state only). The editor must show the draft — the
 * merchant's unpublished work — so it overlays the changeset's operations on
 * top of the stored row exactly the way the storefront's preview
 * (`?changeset=<token>`) does for widgets.
 *
 * Reuses `loadActiveOps` rather than querying operations directly, which is
 * what keeps preview, publish and the editor agreeing about which ops are
 * "active": it applies the per-route cursor (`change_order <= cursor[route]`),
 * so undo/redo — which only moves that cursor — is reflected here with no
 * extra work.
 *
 * The theme gate mirrors `Widget.resolvers.js`: a changeset belongs to the
 * theme it was authored against, and applying its ops while a different theme
 * is active would show edits that can never publish. On a mismatch the stored
 * document is returned unoverlaid rather than throwing, matching the widget
 * path's behaviour.
 *
 * Returns an empty document rather than null when nothing is stored yet: the
 * editor always needs something to render into, and "no document" and "an
 * empty one" are the same thing to a merchant opening a blank page. The
 * caller distinguishes them via `exists`, which decides whether the first
 * save writes an INSERT or an UPDATE op.
 */
export async function loadPuckDocumentForEditing(
  route: string,
  scopeUrn: string | null,
  changesetToken: string | null
): Promise<{ uuid: string | null; data: PuckDocumentData; exists: boolean }> {
  const theme = getActiveTheme();

  const { rows } = await pool.query<{
    uuid: string;
    route: string;
    scope_urn: string | null;
    data: PuckDocumentData;
  }>(
    `SELECT uuid, route, scope_urn, data FROM puck_document
      WHERE route = $1
        AND scope_urn IS NOT DISTINCT FROM $2
        AND theme IS NOT DISTINCT FROM $3
      LIMIT 1`,
    [route, scopeUrn, theme]
  );

  const stored = rows[0] ?? null;

  // The overlay works on a uuid-keyed map, since an op targets a document by
  // uuid — including an INSERT for a document that does not exist yet.
  const documentMap = new Map<string, OverlayDocument>();
  if (stored) {
    documentMap.set(stored.uuid, {
      uuid: stored.uuid,
      route: stored.route,
      scope_urn: stored.scope_urn,
      data: stored.data
    });
  }

  // Which uuids existed BEFORE the overlay, so a document the changeset
  // introduced can be told apart from the published one below.
  const storedKeys = new Set(documentMap.keys());

  if (changesetToken) {
    const { ops, changesetTheme } = await loadActiveOps({
      previewChangesetToken: changesetToken
    });
    if ((changesetTheme === undefined || changesetTheme === theme) && ops.length > 0) {
      applyOverlayToDocuments(documentMap, ops);
    }
  }

  /**
   * Pick the document to edit.
   *
   * The overlay may have INSERTed one for this route that was not in the
   * source, or DELETEd the stored one, so selection is by
   * `(route, scope_urn)` rather than by the stored uuid.
   *
   * When BOTH exist — a changeset staged a document under a fresh uuid while a
   * different one is published for the same route — the staged one wins.
   * Taking the published one instead would show the merchant live content
   * while their draft sat invisible in the changeset, which is the same
   * "editing from the wrong baseline" failure the overlay exists to prevent.
   *
   * This happens whenever the editor minted a uuid because no row existed at
   * the time and something published that route afterwards.
   */
  const candidates = [...documentMap.values()].filter(
    (doc) => doc.route === route && (doc.scope_urn ?? null) === scopeUrn
  );
  const staged = candidates.filter((doc) => !storedKeys.has(doc.uuid));
  const chosen = staged[0] ?? candidates[0];
  if (chosen) {
    return {
      uuid: chosen.uuid,
      data: (chosen.data as PuckDocumentData) ?? EMPTY,
      // `exists` describes the SOURCE row, not the overlaid result: it decides
      // INSERT vs UPDATE for the next op, and a document staged in this same
      // changeset has not created a source row.
      exists: !!stored && stored.uuid === chosen.uuid
    };
  }

  return { uuid: stored?.uuid ?? null, data: EMPTY, exists: false };
}
