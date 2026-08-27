import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type APIRequestContext } from '../../../shared/test.js';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import {
  restorePuckDocuments,
  snapshotPuckDocuments,
  type PuckDocumentSnapshot
} from '../../../shared/puckDocuments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function adminUserId(): number {
  const meta = path.join(__dirname, '..', '..', '..', '.auth', 'admin.meta.json');
  return (JSON.parse(readFileSync(meta, 'utf8')) as { adminUserId: number }).adminUserId;
}

/**
 * Publish and undo for Puck documents.
 *
 * These are the two ends of the changeset contract, and both were built on
 * the assumption that adding a third URN type would carry them for free:
 * publish applies `cms:puck_document` ops through `applyOperationToSource`,
 * and undo only moves a per-route cursor that the editor's read path already
 * honours. Neither had been exercised end to end, and both fail in ways a
 * merchant would notice immediately — a publish that does nothing, or an undo
 * that appears to work until the page is reloaded.
 *
 * The editor's rendered state is read with a plain GET rather than by driving
 * the UI: the document is server-rendered into the response, so this asserts
 * the same loader output the canvas receives, without paying ~50s for the
 * editor bundle on each assertion.
 */

const ROUTE_ID = 'homepage';
const EDITOR = `/admin/page-builder/edit/${ROUTE_ID}`;

/** Coalescing merges same-document writes inside this window; tests that need two ops must clear it. */
const COALESCE_WINDOW_MS = 15_000;

function documentWith(heading: string) {
  return {
    root: { props: {} },
    content: [
      {
        type: 'coupon_block',
        props: { id: 'pu-fixed-id', heading, code: 'PU1', variant: 'card' }
      }
    ]
  };
}

async function postOp(
  request: APIRequestContext,
  changesetId: number,
  urn: string,
  old: unknown,
  next: unknown
) {
  const res = await request.post(
    `/api/page-builder/changesets/${changesetId}/operations`,
    {
      data: {
        route: ROUTE_ID,
        entity_urn: urn,
        old_payload: old === null ? null : { route: ROUTE_ID, scope_urn: null, data: old },
        new_payload: next === null ? null : { route: ROUTE_ID, scope_urn: null, data: next },
        change_order: 0
      }
    }
  );
  expect(res.ok(), `op POST failed: ${res.status()}`).toBe(true);
}

test.describe('puck publish and undo', () => {
  test.setTimeout(180_000);
  // Snapshot the whole table rather than deleting rows: this holds REAL
  // content on a store that has run the backfill, and a spec that deletes it
  // destroys the developer's pages as a side effect of running tests.
  let documentsBefore: PuckDocumentSnapshot[] = [];

  test.beforeEach(async () => {
    documentsBefore = await snapshotPuckDocuments();
  });


  let changesetId: number;

  test.beforeEach(async ({ request }) => {
    await discardAdminChangesets(adminUserId());
    await restorePuckDocuments(documentsBefore);
    const res = await request.get(EDITOR);
    expect(res.ok(), `could not open the editor: ${res.status()}`).toBe(true);
    changesetId = (await getActiveChangesetId(adminUserId()))!;
    expect(changesetId, 'the editor did not create a draft changeset').not.toBeNull();
  });

  test.afterEach(async () => {
    await discardAdminChangesets(adminUserId());
    await restorePuckDocuments(documentsBefore);
  });

  test('publish applies the document to published state and the storefront serves it', async ({
    request
  }) => {
    const heading = `Published ${randomUUID().slice(0, 6)}`;
    const urn = `urn:evershop:cms:puck_document:${randomUUID()}`;

    await postOp(request, changesetId, urn, null, documentWith(heading));

    // Before publish: staged only.
    //
    // Checked by CONTENT rather than by the absence of a row. This route may
    // already have a published document (a backfilled store does), so "no
    // row" fails for a reason unrelated to leakage — and would also pass
    // vacuously on a store where the route was simply never published. What
    // must be true is that THIS heading is not live yet.
    const before = await getDb().query<{ data: unknown }>(
      `SELECT data FROM puck_document WHERE route = $1`,
      [ROUTE_ID]
    );
    for (const row of before.rows) {
      expect(
        JSON.stringify(row.data),
        'the draft leaked into published state'
      ).not.toContain(heading);
    }

    const pub = await request.post(`/api/page-builder/changesets/${changesetId}/publish`);
    expect(pub.ok(), `publish failed: ${pub.status()}`).toBe(true);

    // The op must have been applied to the source table by
    // applyOperationToSource's puck_document branch.
    const after = await getDb().query<{ data: { content: Array<{ props: { heading: string } }> } }>(
      `SELECT data FROM puck_document WHERE route = $1`,
      [ROUTE_ID]
    );
    // Publish must have applied the op through applyOperationToSource's
    // puck_document branch. Located by content rather than by row index, since
    // the route can legitimately hold more than one document.
    const published = after.rows
      .map((r) => JSON.stringify(r.data))
      .filter((d) => d.includes(heading));
    expect(published, 'publish did not write the document').toHaveLength(1);

    // And it must actually reach a shopper through the Puck render path.
    const page = await request.get(`/?__engine=puck`);
    expect(page.ok()).toBe(true);
    expect(await page.text()).toContain(heading);
  });

  test('undo moves the cursor back, and the editor still shows the earlier state after a reload', async ({
    request
  }) => {
    const urn = `urn:evershop:cms:puck_document:${randomUUID()}`;

    await postOp(request, changesetId, urn, null, documentWith('undo-v1'));

    // Clear the coalescing window, or the second write would rewrite the first
    // op in place and there would be nothing to undo.
    await new Promise((r) => setTimeout(r, COALESCE_WINDOW_MS + 1000));

    await postOp(request, changesetId, urn, documentWith('undo-v1'), documentWith('undo-v2'));

    const ops = await getDb().query(
      `SELECT change_order FROM changeset_operation
        WHERE changeset_id = $1 AND entity_urn = $2 ORDER BY change_order`,
      [changesetId, urn]
    );
    expect(ops.rows, 'the two edits should be separate ops').toHaveLength(2);

    // The editor sees the latest state.
    expect(await (await request.get(EDITOR)).text()).toContain('undo-v2');

    const undo = await request.post(
      `/api/page-builder/changesets/${changesetId}/move-current`,
      { data: { route: ROUTE_ID, direction: 'undo' } }
    );
    expect(undo.ok(), `undo failed: ${undo.status()}`).toBe(true);

    // Undo only moves the cursor — the op itself must survive, which is what
    // makes redo possible and what distinguishes undo from discard.
    const afterUndo = await getDb().query(
      `SELECT change_order FROM changeset_operation
        WHERE changeset_id = $1 AND entity_urn = $2`,
      [changesetId, urn]
    );
    expect(afterUndo.rows, 'undo deleted an operation instead of moving the cursor').toHaveLength(2);

    // The editor must now render the EARLIER state. Reading it from a fresh
    // request is the point: an undo that only updated client state would still
    // look right in the open tab and be wrong here.
    const reloaded = await (await request.get(EDITOR)).text();
    expect(reloaded).toContain('undo-v1');
    expect(reloaded).not.toContain('undo-v2');

    // Redo returns to the later state.
    const redo = await request.post(
      `/api/page-builder/changesets/${changesetId}/move-current`,
      { data: { route: ROUTE_ID, direction: 'redo' } }
    );
    expect(redo.ok(), `redo failed: ${redo.status()}`).toBe(true);
    expect(await (await request.get(EDITOR)).text()).toContain('undo-v2');
  });
});
