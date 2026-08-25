import { UrnService } from '../../../lib/urn/index.js';
import type { ChangesetOperationRow } from '../../../types/db/index.js';
import { inferOpType } from './applyOperationToSource.js';

/**
 * In-memory overlay engine for Puck documents — the `puck_document`
 * counterpart to `applyOverlayToWidgets`.
 *
 * Same job (take live source state, apply a changeset's ops in
 * `change_order` order, hand the result to the renderer) and the same
 * uuid-keyed contract, but far simpler, because a document is atomic where
 * widgets are a graph.
 *
 * `applyOverlayToWidgets` has to reason about referential integrity across
 * two maps: a placement INSERT is skipped when its parent widget is unknown,
 * an UPDATE is skipped when a competing publish already deleted the row, a
 * widget DELETE has to cascade to its placements. None of that exists here.
 * Ops carry whole-`Data` snapshots, so applying one is an assignment and the
 * last op at or below the cursor simply wins. That is the practical payoff of
 * choosing snapshots over patches — with patches this would have to fold every
 * op from zero on every preview request and every rollout evaluation.
 *
 * Deletion is represented by removing the key, not by storing a tombstone:
 * callers iterate the resulting map, so an absent document renders as "no
 * document for this route", which is exactly what a deleted one should do.
 */

export type OverlayDocument = {
  uuid: string;
  route: string;
  scope_urn: string | null;
  data: unknown;
  // Anything else from the source row passes through untouched.
  [key: string]: unknown;
};

export function applyOverlayToDocuments(
  documentMap: Map<string, OverlayDocument>,
  ops: ChangesetOperationRow[]
): void {
  // Sort defensively — callers order by change_order already, but an overlay
  // applied out of order silently produces a stale document rather than
  // failing, so it is not worth trusting.
  const sorted = [...ops].sort((a, b) => a.change_order - b.change_order);

  for (const op of sorted) {
    const parts = UrnService.parse(op.entity_urn);
    // Widget ops are ignored here and document ops are ignored by
    // applyOverlayToWidgets, so a changeset spanning both — which happens
    // across the cutover — applies correctly to whichever source the caller
    // is rendering from.
    if (parts.service !== 'cms' || parts.type !== 'puck_document') continue;

    const opType = inferOpType(op.old_payload, op.new_payload);

    if (opType === 'DELETE') {
      documentMap.delete(parts.uuid);
      continue;
    }

    const payload = (op.new_payload ?? {}) as Partial<OverlayDocument>;

    if (opType === 'INSERT') {
      documentMap.set(parts.uuid, {
        ...payload,
        uuid: parts.uuid,
        route: payload.route as string,
        scope_urn: (payload.scope_urn ?? null) as string | null,
        data: payload.data ?? { content: [], root: { props: {} } }
      });
      continue;
    }

    // UPDATE. Unlike the widget overlay — which skips an UPDATE whose target
    // is missing, letting a competing publish's DELETE win — an update to an
    // absent document is materialized. The op carries the entire document, so
    // there is nothing to merge into and nothing to lose; treating it as a
    // no-op would blank a page whose row was concurrently replaced, which is
    // the worse failure.
    const existing = documentMap.get(parts.uuid);
    documentMap.set(parts.uuid, {
      ...(existing ?? {}),
      ...payload,
      uuid: parts.uuid,
      route: (payload.route ?? existing?.route) as string,
      scope_urn: (payload.scope_urn ?? existing?.scope_urn ?? null) as string | null,
      data: payload.data ?? existing?.data ?? { content: [], root: { props: {} } }
    });
  }
}
