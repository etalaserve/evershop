import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type APIRequestContext } from '../../../shared/test.js';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function adminUserId(): number {
  const meta = path.join(__dirname, '..', '..', '..', '.auth', 'admin.meta.json');
  return (JSON.parse(readFileSync(meta, 'utf8')) as { adminUserId: number }).adminUserId;
}

/**
 * Server-side op coalescing.
 *
 * The Puck editor saves a whole-document snapshot on a debounce, so one
 * logical edit — dragging a slider, typing a heading — produces a burst of
 * writes. Without coalescing each becomes a permanent op, which grows the
 * changeset without bound and makes Undo step through dozens of
 * near-identical states to reverse a single edit.
 *
 * These tests pin both halves of the rule, because the failure modes point in
 * opposite directions: too little coalescing is merely wasteful, while too
 * much silently destroys undo history a merchant depends on.
 */

const ROUTE_ID = 'homepage';

function documentWith(heading: string) {
  return {
    root: { props: {} },
    content: [
      { type: 'coupon_block', props: { id: 'fixed-id', heading, code: 'C1', variant: 'card' } }
    ]
  };
}

async function postOp(
  request: APIRequestContext,
  changesetId: number,
  urn: string,
  payload: { old: unknown; next: unknown }
) {
  const res = await request.post(
    `/api/page-builder/changesets/${changesetId}/operations`,
    {
      data: {
        route: ROUTE_ID,
        entity_urn: urn,
        old_payload:
          payload.old === null
            ? null
            : { route: ROUTE_ID, scope_urn: null, data: payload.old },
        new_payload:
          payload.next === null
            ? null
            : { route: ROUTE_ID, scope_urn: null, data: payload.next },
        change_order: 0
      }
    }
  );
  expect(res.ok(), `op POST failed: ${res.status()}`).toBe(true);
  return res;
}

async function opsFor(changesetId: number) {
  const { rows } = await getDb().query(
    `SELECT change_order, old_payload, new_payload
       FROM changeset_operation
      WHERE changeset_id = $1 AND entity_urn LIKE 'urn:evershop:cms:puck_document:%'
      ORDER BY change_order`,
    [changesetId]
  );
  return rows as Array<{
    change_order: number;
    old_payload: { data: { content: Array<{ props: { heading: string } }> } } | null;
    new_payload: { data: { content: Array<{ props: { heading: string } }> } } | null;
  }>;
}

test.describe('changeset op coalescing', () => {
  test.setTimeout(120_000);

  let changesetId: number;

  test.beforeEach(async ({ request }) => {
    await discardAdminChangesets(adminUserId());
    // Let the editor's own loader create the draft — a plain GET runs
    // getOrCreateDraft without paying for the editor's client bundle.
    const res = await request.get(`/admin/page-builder/edit/${ROUTE_ID}`);
    expect(res.ok(), `could not open the editor: ${res.status()}`).toBe(true);
    changesetId = (await getActiveChangesetId(adminUserId()))!;
    expect(changesetId, 'the editor did not create a draft changeset').not.toBeNull();
  });

  test.afterEach(async () => {
    await discardAdminChangesets(adminUserId());
  });

  test('rapid edits to the same document collapse into one op', async ({ request }) => {
    const urn = `urn:evershop:cms:puck_document:${randomUUID()}`;

    await postOp(request, changesetId, urn, { old: null, next: documentWith('v1') });
    await postOp(request, changesetId, urn, {
      old: documentWith('v1'),
      next: documentWith('v2')
    });
    await postOp(request, changesetId, urn, {
      old: documentWith('v2'),
      next: documentWith('v3')
    });

    const ops = await opsFor(changesetId);
    expect(ops, 'three rapid edits should be one op').toHaveLength(1);

    // The surviving op must describe (before the first edit, state now).
    // Keeping the tip's old_payload is what preserves INSERT-ness: this began
    // as an INSERT and must still be one, or publish would try to UPDATE a
    // row that does not exist.
    expect(ops[0].old_payload).toBeNull();
    expect(ops[0].new_payload!.data.content[0].props.heading).toBe('v3');
  });

  test('a different document is never merged into the tip', async ({ request }) => {
    const a = `urn:evershop:cms:puck_document:${randomUUID()}`;
    const b = `urn:evershop:cms:puck_document:${randomUUID()}`;

    await postOp(request, changesetId, a, { old: null, next: documentWith('doc-a') });
    await postOp(request, changesetId, b, { old: null, next: documentWith('doc-b') });

    const ops = await opsFor(changesetId);
    expect(ops, 'two documents must stay two ops').toHaveLength(2);
  });

  test('a delete stays its own op, and is not absorbed by a later edit', async ({
    request
  }) => {
    // Deletions are discrete structural actions. Merging one into a
    // neighbouring edit would make it impossible to undo the delete alone.
    const urn = `urn:evershop:cms:puck_document:${randomUUID()}`;

    await postOp(request, changesetId, urn, { old: null, next: documentWith('v1') });
    await postOp(request, changesetId, urn, { old: documentWith('v1'), next: null });

    const ops = await opsFor(changesetId);
    expect(ops, 'a delete must not coalesce').toHaveLength(2);
    expect(ops[1].new_payload).toBeNull();
  });
});
