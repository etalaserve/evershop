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
 * Entity-scoped documents.
 *
 * A landing page can carry its own layout instead of the route-wide default.
 * This is NEW capability, not a port: the legacy RRv7 editor read only
 * `?session=` and hardcoded a null entity on every placement it created, so
 * no entity-scoped content has ever existed. `puck_document.scope_urn` and
 * Phase 5's landing-page work both depend on it.
 *
 * The failure mode that matters is quiet: a scope that is dropped or
 * malformed does not error, it just edits the wrong document — either the
 * route default (so every landing page changes at once) or an orphan nothing
 * ever reads.
 */

const ROUTE_ID = 'landingPageView';
const SCOPE_URN = `urn:evershop:promotion:landing_page:${randomUUID()}`;

function editorUrl(entity?: string) {
  const base = `/admin/page-builder/edit/${ROUTE_ID}`;
  return entity ? `${base}?entity=${encodeURIComponent(entity)}` : base;
}

async function stage(
  request: APIRequestContext,
  changesetId: number,
  scopeUrn: string | null,
  heading: string
) {
  const res = await request.post(
    `/api/page-builder/changesets/${changesetId}/operations`,
    {
      data: {
        route: ROUTE_ID,
        entity_urn: `urn:evershop:cms:puck_document:${randomUUID()}`,
        old_payload: null,
        new_payload: {
          route: ROUTE_ID,
          scope_urn: scopeUrn,
          data: {
            root: { props: {} },
            content: [
              {
                type: 'coupon_block',
                props: { id: randomUUID(), heading, code: 'ES1', variant: 'card' }
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

test.describe('entity-scoped puck documents', () => {
  test.setTimeout(180_000);
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

  test('a scoped document and the route default stay separate', async ({ request }) => {
    await discardAdminChangesets(adminUserId());

    const opened = await request.get(editorUrl(SCOPE_URN));
    expect(opened.ok(), `editor did not open: ${opened.status()}`).toBe(true);
    const changesetId = (await getActiveChangesetId(adminUserId()))!;
    expect(changesetId).not.toBeNull();

    await stage(request, changesetId, SCOPE_URN, 'scoped-content');
    await stage(request, changesetId, null, 'route-default-content');

    // Each editor URL must see only its own document. If the scope were
    // dropped, both would show the same thing — and editing one landing page
    // would silently change every one of them.
    const scoped = await (await request.get(editorUrl(SCOPE_URN))).text();
    expect(scoped).toContain('scoped-content');
    expect(scoped).not.toContain('route-default-content');

    const fallback = await (await request.get(editorUrl())).text();
    expect(fallback).toContain('route-default-content');
    expect(fallback).not.toContain('scoped-content');
  });

  test('a malformed entity falls back to the route default', async ({ request }) => {
    // The value is stored verbatim as scope_urn and is part of that table's
    // uniqueness key, so an unvalidated one would not fail — it would create a
    // document nothing reads again.
    await discardAdminChangesets(adminUserId());

    const opened = await request.get(editorUrl('not-a-urn'));
    expect(opened.ok()).toBe(true);
    const changesetId = (await getActiveChangesetId(adminUserId()))!;

    await stage(request, changesetId, null, 'route-default-content');

    const html = await (await request.get(editorUrl('not-a-urn'))).text();
    expect(html).toContain('route-default-content');
  });

  test('the header names the scope being edited', async ({ page }) => {
    // Without this the editor looks identical whether it is editing one
    // landing page or the default all of them fall back to.
    await page.goto(editorUrl(SCOPE_URN));
    await expect(page.locator('.Puck').first()).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText('landing_page', { exact: false })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Edit route default' })
    ).toBeVisible();
  });
});
