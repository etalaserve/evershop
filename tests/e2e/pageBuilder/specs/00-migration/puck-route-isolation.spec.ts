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
 * Per-route cursors, and palette completeness.
 *
 * Rewrites two of the quarantined legacy-DOM specs against Puck:
 * `07-gap/undo-redo-isolation` and the palette half of `02-sidebar/sidebar-tabs`.
 * Both describe behaviour that still exists; only the DOM they asserted on is
 * gone.
 *
 * Cursor isolation is the one that matters. A changeset spans every route a
 * merchant touched, and `change_order` is global across it, but the applied
 * window is per-route — so undoing on one page must not rewind another. Get it
 * wrong and pressing Undo on the homepage silently reverts unrelated work on
 * the cart, which the merchant will not discover until they publish.
 */

/**
 * The second route this test edits.
 *
 * Deliberately NOT `cart`: that route requires `cart_summary`, so staging a
 * plain content document there is refused 400 by the route guarantee — which
 * would fail this test for a reason that has nothing to do with cursor
 * isolation. `blogHome` carries no required components.
 */
const SECOND_ROUTE = 'blogHome';

function editorUrl(routeId: string) {
  return `/admin/page-builder/puck/${routeId}`;
}

async function stage(
  request: APIRequestContext,
  changesetId: number,
  routeId: string,
  heading: string
) {
  const res = await request.post(
    `/api/page-builder/changesets/${changesetId}/operations`,
    {
      data: {
        route: routeId,
        entity_urn: `urn:evershop:cms:puck_document:${randomUUID()}`,
        old_payload: null,
        new_payload: {
          route: routeId,
          scope_urn: null,
          data: {
            root: { props: {} },
            content: [
              {
                type: 'coupon_block',
                props: { id: randomUUID(), heading, code: 'RI1', variant: 'card' }
              }
            ]
          }
        },
        change_order: 0
      }
    }
  );
  expect(res.ok(), `staging failed: ${res.status()}`).toBe(true);
}

test.describe('per-route isolation and palette', () => {
  test.setTimeout(240_000);
  // Snapshot the whole table rather than deleting rows: this holds REAL
  // content on a store that has run the backfill, and a spec that deletes it
  // destroys the developer's pages as a side effect of running tests.
  let documentsBefore: PuckDocumentSnapshot[] = [];

  test.beforeEach(async () => {
    documentsBefore = await snapshotPuckDocuments();
  });


  test.afterEach(async () => {
    await discardAdminChangesets(adminUserId());
    await restorePuckDocuments(documentsBefore);
  });

  test('undo on one route leaves another route untouched', async ({ request }) => {
    await discardAdminChangesets(adminUserId());
    expect((await request.get(editorUrl('homepage'))).ok()).toBe(true);
    const changesetId = (await getActiveChangesetId(adminUserId()))!;
    expect(changesetId).not.toBeNull();

    await stage(request, changesetId, 'homepage', 'home-edit');
    await stage(request, changesetId, SECOND_ROUTE, 'other-edit');

    // Both routes show their own edit.
    expect(await (await request.get(editorUrl('homepage'))).text()).toContain('home-edit');
    expect(await (await request.get(editorUrl(SECOND_ROUTE))).text()).toContain('other-edit');

    const undo = await request.post(
      `/api/page-builder/changesets/${changesetId}/move-current`,
      { data: { route: 'homepage', direction: 'undo' } }
    );
    expect(undo.ok(), `undo failed: ${undo.status()}`).toBe(true);

    // Homepage rewound...
    expect(await (await request.get(editorUrl('homepage'))).text()).not.toContain('home-edit');

    // ...and cart did NOT. change_order is global across the changeset, so an
    // undo implemented as "step back one op" rather than "step back one op ON
    // THIS ROUTE" would silently revert the cart here.
    expect(
      await (await request.get(editorUrl(SECOND_ROUTE))).text(),
      'undo on homepage reverted work on another route'
    ).toContain('other-edit');

    // The cursor map itself must show only homepage moved.
    const { rows } = await getDb().query<{ route_cursors: Record<string, number> }>(
      `SELECT route_cursors FROM changeset WHERE changeset_id = $1`,
      [changesetId]
    );
    expect(rows[0].route_cursors[SECOND_ROUTE]).toBeGreaterThan(0);
  });

  test('the palette offers every registered widget type', async ({ page }) => {
    // Guards the generated config: buildPuckConfig skips any palette entry
    // whose component is not registered, so a broken registration shows up
    // here as a missing drawer item rather than as an error.
    await page.goto(editorUrl('homepage'));
    await expect(page.locator('.Puck').first()).toBeVisible({ timeout: 120_000 });

    // Attachment, not visibility: Puck renders a hidden drag-ghost alongside
    // each drawer item, so `.first()` resolves to a deliberately invisible
    // element and a visibility assertion fails on a perfectly good palette.
    const items = page.locator('[data-testid^="drawer-item:"]');
    await expect(items.first()).toBeAttached({ timeout: 60_000 });

    const count = await items.count();
    // 28 component types back 53 palette variants; the drawer registers one
    // entry per TYPE, because `type` is what gets persisted.
    expect(count, `expected the full widget set, saw ${count}`).toBeGreaterThanOrEqual(25);

    // Spot-check across categories so a truncated list cannot pass on volume.
    for (const type of ['columns', 'section', 'banner', 'coupon_block', 'faq_block']) {
      await expect(
        page.locator(`[data-testid="drawer-item:${type}"]`).first(),
        `palette is missing ${type}`
      ).toBeAttached();
    }
  });
});
