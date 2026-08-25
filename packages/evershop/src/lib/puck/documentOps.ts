import { CmsUrn } from '../urn/index.js';

/**
 * Build the changeset operation for a Puck document edit.
 *
 * ## Why whole-document snapshots rather than patches
 *
 * `old_payload`/`new_payload` each carry the ENTIRE document. That keeps the
 * `(old, new)` type-inference contract the rest of the changeset system is
 * built on — `(null, doc)` is an INSERT, `(doc, doc)` an UPDATE, `(doc, null)`
 * a DELETE — which `inferOpType`, the publish path and the overlay all depend
 * on. It also makes publish naturally idempotent, and makes a cursor move a
 * seek rather than a fold: undo/redo only moves `change_order`, and the
 * document at any cursor is simply the last op at or below it. Patches would
 * break all four to save disk, which is the cheapest resource here.
 *
 * Storage is controlled by coalescing on the server instead.
 *
 * ## INSERT vs UPDATE
 *
 * `old` is null only while no source row exists AND this changeset has not
 * already staged one. Once an INSERT is staged, later edits are UPDATEs
 * against it — `applyOverlayToDocuments` deliberately materializes an UPDATE
 * whose target is missing, and publish replays INSERT-then-UPDATE in
 * `change_order`, so both paths agree.
 */

export interface PuckDocumentPayload {
  route: string;
  scope_urn: string | null;
  data: unknown;
}

export interface DocumentOperation {
  route: string;
  entityUrn: string;
  oldPayload: PuckDocumentPayload | null;
  newPayload: PuckDocumentPayload | null;
}

export function buildDocumentSaveOp(input: {
  /** The document's uuid — mint one for a route that has never been edited. */
  uuid: string;
  route: string;
  scopeUrn: string | null;
  /** The document as it stood before this edit; null when none existed. */
  previous: unknown | null;
  next: unknown;
}): DocumentOperation {
  return {
    route: input.route,
    entityUrn: CmsUrn.puckDocument(input.uuid),
    oldPayload:
      input.previous === null
        ? null
        : { route: input.route, scope_urn: input.scopeUrn, data: input.previous },
    newPayload: {
      route: input.route,
      scope_urn: input.scopeUrn,
      data: input.next
    }
  };
}
