import {
  commit,
  del,
  insert,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { UrnService } from '../../../../lib/urn/index.js';
import {
  BAD_REQUEST,
  CREATED,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { isForeignDraft } from '../../services/changesetOwnership.js';

/**
 * POST /api/page-builder/changesets/:id/operations
 *
 * Body:
 *   {
 *     route: string,
 *     entity_urn: string,         // urn:evershop:cms:widget_instance:<uuid> | widget_placement
 *     old_payload: object | null,
 *     new_payload: object | null,
 *     change_order: int           // monotonic; client-allocated
 *   }
 *
 * Persists the operation row, advances this route's cursor in
 * `route_cursors`, and bumps `updated_at`. Returns the persisted row.
 * Phase 3a's contract stops here — preview data (per spec § 7.3.3) lands
 * in Phase 3b/3c when the admin UI consumes it.
 */
// 3-arg signature: with only 2 args `buildMiddlewareFunction` auto-calls
// next() after the handler resolves, which runs apiResponse on an
// already-sent response and trips ERR_HTTP_HEADERS_SENT. We send via
// `.json()` directly and deliberately do not invoke `_next`.
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
   
  _next: (err?: unknown) => void
) => {
  const changesetId = Number(request.params.id);
  if (!Number.isInteger(changesetId) || changesetId <= 0) {
    return response.status(BAD_REQUEST).json({
      error: { status: BAD_REQUEST, message: 'Invalid changeset id' }
    });
  }

  const userId = (request as any).locals?.user?.admin_user_id;
  if (!userId) {
    return response.status(FORBIDDEN).json({
      error: { status: FORBIDDEN, message: 'Admin auth required' }
    });
  }

  const body = request.body ?? {};
  const errors: string[] = [];

  const route = typeof body.route === 'string' ? body.route : null;
  if (!route) errors.push('route is required');

  const entityUrn =
    typeof body.entity_urn === 'string' ? body.entity_urn : null;
  if (!entityUrn) {
    errors.push('entity_urn is required');
  } else if (!UrnService.isValid(entityUrn)) {
    errors.push(`entity_urn is not a registered URN: ${entityUrn}`);
  }

  const oldPayload =
    body.old_payload === undefined ? null : body.old_payload;
  const newPayload =
    body.new_payload === undefined ? null : body.new_payload;
  if (oldPayload == null && newPayload == null) {
    errors.push(
      'At least one of old_payload / new_payload must be set (op type must be inferable)'
    );
  }

  const changeOrder = Number(body.change_order);
  if (!Number.isInteger(changeOrder) || changeOrder < 0) {
    errors.push('change_order must be a non-negative integer');
  }

  if (errors.length > 0) {
    return response.status(BAD_REQUEST).json({
      error: { status: BAD_REQUEST, message: errors.join('; ') }
    });
  }

  const conn = await getConnection();
  await startTransaction(conn);
  try {
    // Lock the changeset row for the duration of the transaction. Two tabs
    // (or the client's parallel auto-save POSTs) can otherwise both read the
    // same MAX(change_order) and route_cursors snapshot, insert a DUPLICATE
    // change_order, and last-write-wins clobber the other's cursor entry —
    // silently dropping an op from the applied window. FOR UPDATE serializes
    // concurrent adds on the same changeset so each sees the committed state.
    const lockRes = await conn.query(
      'SELECT * FROM changeset WHERE changeset_id = $1 FOR UPDATE',
      [changesetId]
    );
    const changeset = lockRes.rows[0];
    if (!changeset) {
      await rollback(conn);
      return response.status(NOT_FOUND).json({
        error: {
          status: NOT_FOUND,
          message: `Changeset ${changesetId} not found`
        }
      });
    }
    if (isForeignDraft(changeset, userId)) {
      await rollback(conn);
      return response.status(FORBIDDEN).json({
        error: {
          status: FORBIDDEN,
          message: 'You do not have access to this draft changeset'
        }
      });
    }
    if ((changeset as any).published_at) {
      await rollback(conn);
      return response.status(BAD_REQUEST).json({
        error: {
          status: BAD_REQUEST,
          message: 'Cannot add operations to a published changeset'
        }
      });
    }

    // --- Theme scope enforcement (spec 04 § 9.5, § 9.7) ---
    // The changeset's theme is authoritative; the editor never has to know
    // about theme because the server enforces it here, on the one endpoint
    // every page-builder write funnels through.
    //   - INSERT: stamp `changeset.theme` onto `new_payload`, overriding any
    //     client-supplied value (defence against buggy/malicious clients).
    //     The publish path materialises the row with this tag.
    //   - UPDATE / DELETE: the target source row must belong to the same
    //     theme. A cross-theme write is a 400 `theme scope violation`; the
    //     transaction rolls back and nothing is persisted.
    const changesetTheme = ((changeset as any).theme ?? null) as string | null;
    const parsedUrn = UrnService.parse(entityUrn as string);
    const URN_TABLE: Record<string, string> = {
      'cms:widget_instance': 'widget_instance',
      'cms:widget_placement': 'widget_placement',
      'cms:puck_document': 'puck_document'
    };
    const targetTable = URN_TABLE[`${parsedUrn.service}:${parsedUrn.type}`];

    if (oldPayload == null && newPayload != null) {
      if (typeof newPayload === 'object') {
        (newPayload as any).theme = changesetTheme;
      }
    } else if (oldPayload != null && targetTable) {
      const targetRow = await select()
        .from(targetTable)
        .where('uuid', '=', parsedUrn.uuid)
        .load(conn);
      if (
        targetRow &&
        (((targetRow as any).theme ?? null) as string | null) !== changesetTheme
      ) {
        await rollback(conn);
        return response.status(BAD_REQUEST).json({
          error: {
            status: BAD_REQUEST,
            message:
              `theme scope violation: changeset theme '${changesetTheme}', ` +
              `target row theme '${(targetRow as any).theme ?? null}'`
          }
        });
      }
    }

    // Per-route cursor model. Each route in `changeset.route_cursors` carries
    // its own "highest applied change_order" — undo/redo and redo-stack
    // truncation are scoped to a single route. `change_order` itself stays
    // globally monotonic across the whole changeset so storage order is
    // unambiguous; only the *applied window* is per-route.
    void changeOrder;
    const routeCursors =
      ((changeset as any).route_cursors as Record<string, number> | null) ?? {};
    const routeCursorOrder = Number(routeCursors[route] ?? 0);

    // Truncate this route's redo stack only. Ops on OTHER routes that happen
    // to sit past `routeCursorOrder` (e.g. user edited homepage at op 12,
    // then switched to cart and pressed Undo) stay alive.
    await del('changeset_operation')
      .where('changeset_id', '=', changesetId)
      .and('route', '=', route)
      .and('change_order', '>', routeCursorOrder)
      .execute(conn);

    /**
     * Coalesce a rapid follow-up edit into the tip instead of appending.
     *
     * The Puck editor saves a whole-document snapshot on a debounce, so a
     * merchant dragging a slider or typing a heading produces a save every
     * few hundred milliseconds. Appending each one would grow the changeset
     * without bound and — because undo moves the cursor one op at a time —
     * make Undo step through dozens of near-identical states to reverse one
     * logical edit.
     *
     * When the incoming write targets the same document as the tip and the
     * tip is younger than the window, its `new_payload` is rewritten in
     * place. `change_order` and `route_cursors` do not move, so the unique
     * index, the redo stack and every apply path are untouched.
     *
     * `old_payload` deliberately stays the TIP's: the pair must describe
     * (state before the first edit in this window, state now). Taking the
     * incoming op's `old_payload` would make undo restore an intermediate
     * state that the merchant never saw as a resting point, and would break
     * INSERT-ness — an INSERT coalesced with a later UPDATE has to stay an
     * INSERT, which it does precisely because a null `old_payload` is kept.
     *
     * Four things are never coalesced:
     *  - A DELETE, incoming or tip. Deletions are discrete structural
     *    actions and must remain individually undoable.
     *  - A different document. Only the same `entity_urn` merges.
     *  - Anything at or below a rollout floor: the floor is what live
     *    traffic is already being served, so rewriting that op would change
     *    what shoppers see without a publish.
     *  - A tip older than the window, which bounds a long editing session to
     *    roughly one op per window rather than one per keystroke.
     */
    const COALESCE_WINDOW_MS = 15_000;

    if (newPayload !== null && routeCursorOrder > 0) {
      // The floor is the rollout's snapshot cursor for this route, matching
      // moveCurrentChange's own rule. Absent a rollout there is no floor.
      const rolloutPlan = await select()
        .from('rollout_plan')
        .where('changeset_id', '=', changesetId)
        .load(conn);
      const floor = rolloutPlan
        ? Number(
            (((rolloutPlan as any).route_cursors as Record<string, number> | null) ??
              {})[route] ?? 0
          )
        : 0;

      if (routeCursorOrder > floor) {
        const tipRes = await conn.query(
          `SELECT * FROM changeset_operation
            WHERE changeset_id = $1 AND route = $2 AND change_order = $3
            LIMIT 1`,
          [changesetId, route, routeCursorOrder]
        );
        const tip = tipRes.rows[0] as
          | {
              changeset_operation_id: number;
              entity_urn: string;
              new_payload: unknown;
              created_at: string | Date;
            }
          | undefined;

        const withinWindow =
          !!tip &&
          Date.now() - new Date(tip.created_at).getTime() < COALESCE_WINDOW_MS;

        if (
          tip &&
          withinWindow &&
          tip.entity_urn === entityUrn &&
          tip.new_payload !== null
        ) {
          const updated = await conn.query(
            `UPDATE changeset_operation
                SET new_payload = $1::jsonb
              WHERE changeset_operation_id = $2
              RETURNING *`,
            [JSON.stringify(newPayload), tip.changeset_operation_id]
          );
          // `updated_at` is the changeset's natural version token — overlay
          // memoization keys on it — so it still has to move even though no
          // cursor did.
          await conn.query(
            `UPDATE changeset SET updated_at = NOW() WHERE changeset_id = $1`,
            [changesetId]
          );
          await commit(conn);
          return response.status(CREATED).json({ data: updated.rows[0] });
        }
      }
    }

    // New change_order = max(existing) + 1 across the whole changeset, so the
    // storage order keeps a single timeline. Apply paths still split by
    // route_cursors when filtering "what's currently applied".
    const maxRow = await conn.query(
      `SELECT COALESCE(MAX(change_order), 0)::int AS max FROM changeset_operation WHERE changeset_id = $1`,
      [changesetId]
    );
    const newOrder = Number((maxRow.rows[0] as any)?.max ?? 0) + 1;

    const op = await insert('changeset_operation')
      .given({
        changeset_id: changesetId,
        route,
        entity_urn: entityUrn,
        old_payload: oldPayload,
        new_payload: newPayload,
        change_order: newOrder
      })
      .execute(conn);

    // Advance this route's cursor to the just-inserted op's order.
    const nextRouteCursors = { ...routeCursors, [route]: newOrder };
    await conn.query(
      `UPDATE changeset
         SET route_cursors = $1::jsonb,
             updated_at = NOW()
       WHERE changeset_id = $2`,
      [JSON.stringify(nextRouteCursors), changesetId]
    );

    await commit(conn);
    return response.status(CREATED).json({ data: op });
  } catch (e) {
    await rollback(conn);
    return response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Failed to add operation'
      }
    });
  }
};
