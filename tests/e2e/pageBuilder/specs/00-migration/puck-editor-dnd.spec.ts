import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '../../../shared/test.js';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function adminUserId(): number {
  const meta = path.join(__dirname, '..', '..', '..', '.auth', 'admin.meta.json');
  return (JSON.parse(readFileSync(meta, 'utf8')) as { adminUserId: number }).adminUserId;
}

/**
 * The editor's WRITE path, driven the way a merchant drives it.
 *
 * `puck-editor.spec.ts` covers reading staged state; this covers producing it.
 * It is the one test that exercises the whole chain end to end — a real drag
 * gesture, Puck's `onChange`, the debounced save, the changeset op endpoint,
 * and the overlay that reads it back — so it is what proves the editor
 * actually works rather than merely renders.
 *
 * Dragging is done with real pointer events rather than a synthetic drop.
 * Puck uses pointer-based dnd and bridges those events across the canvas
 * iframe boundary; a dispatched `drop` would bypass exactly the machinery
 * most likely to break.
 */

const ROUTE_ID = 'homepage';
const EDITOR = `/admin/page-builder/puck/${ROUTE_ID}`;

/** Wait until Puck's canvas iframe has mounted and taken its styles. */
async function waitForCanvas(page: Page): Promise<void> {
  await expect(page.locator('.Puck').first()).toBeVisible({ timeout: 120_000 });
  await page.waitForFunction(
    () => {
      const el = document.getElementById('preview-frame') as HTMLIFrameElement | null;
      return (el?.contentDocument?.head?.querySelectorAll('style, link').length ?? 0) > 0;
    },
    undefined,
    { timeout: 180_000 }
  );
  // Puck settles its layout right after the frame takes styles; dragging into
  // a box that is still moving drops on the wrong target.
  await page.waitForTimeout(2000);
}

/** Drag a palette entry into the canvas with real pointer movement. */
async function dragIntoCanvas(page: Page, type: string): Promise<void> {
  const item = page.locator(`[data-testid="drawer-item:${type}"]`);
  await expect(item).toBeVisible();
  const src = await item.boundingBox();
  const canvas = await page.locator('#preview-frame').boundingBox();
  if (!src || !canvas) throw new Error('could not locate drag source or canvas');

  const from = { x: src.x + src.width / 2, y: src.y + src.height / 2 };
  const to = { x: canvas.x + canvas.width / 2, y: canvas.y + 120 };

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // Incremental movement matters: pointer-based dnd only activates after the
  // pointer travels past a threshold, so a single jump to the target reads as
  // a click and drops nothing.
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / 12,
      from.y + ((to.y - from.y) * i) / 12,
      { steps: 3 }
    );
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(400);
  await page.mouse.up();
}

/**
 * Poll until the changeset holds a document op.
 *
 * Deliberately NOT a fixed sleep. The save is debounced and then round-trips,
 * so a sleep either flakes or is padded far beyond what it needs — this was
 * observed failing intermittently against a 4s wait while the code was
 * correct.
 */
async function waitForDocumentOp(
  changesetId: number,
  timeoutMs = 30_000
): Promise<Array<{ entity_urn: string; new_payload: { data: { content: unknown[] } } }>> {
  const db = getDb();
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { rows } = await db.query(
      `SELECT entity_urn, new_payload FROM changeset_operation
        WHERE changeset_id = $1 AND entity_urn LIKE 'urn:evershop:cms:puck_document:%'
        ORDER BY change_order`,
      [changesetId]
    );
    if (rows.length > 0) return rows as never;
    if (Date.now() > deadline) return [];
    await new Promise((r) => setTimeout(r, 500));
  }
}

test.describe('puck editor: drag and drop', () => {
  // See puck-editor.spec.ts — the dev server needs ~50s before the editor is
  // interactive, and this spec loads it twice.
  test.setTimeout(300_000);

  test.afterEach(async () => {
    await discardAdminChangesets(adminUserId());
    await getDb().query(`DELETE FROM puck_document WHERE route = $1`, [ROUTE_ID]);
  });

  test('dropping a component writes a changeset op and survives a reload', async ({
    page
  }) => {
    await discardAdminChangesets(adminUserId());

    await page.goto(EDITOR);
    await waitForCanvas(page);
    await dragIntoCanvas(page, 'coupon_block');

    const changesetId = await getActiveChangesetId(adminUserId());
    expect(changesetId, 'the editor did not create a draft changeset').not.toBeNull();

    const ops = await waitForDocumentOp(changesetId!);
    expect(ops.length, 'the drop did not produce a changeset operation').toBeGreaterThan(0);

    // The op must carry the whole document, with the dropped component in it.
    const content = ops[ops.length - 1].new_payload.data.content as Array<{
      type: string;
    }>;
    expect(content.map((c) => c.type)).toContain('coupon_block');

    // Reload: the component must come back, which means it round-tripped
    // through the op endpoint and back out through the changeset overlay.
    // A save that only lived in Puck's memory would vanish here.
    await page.goto(EDITOR);
    await waitForCanvas(page);
    // VISIBLE, not merely attached. Every palette entry's `defaultSettings` are
    // empty strings, so a freshly dropped widget renders no content of its own
    // — `coupon_block` with no heading and no code draws nothing. The editor
    // wraps each component in an empty-state shell (edit mode only) precisely
    // so the merchant can see and click what they just dropped. Asserting
    // visibility here is what keeps that shell from silently regressing back
    // into a zero-height box.
    await expect(
      page.frameLocator('#preview-frame').locator('[data-puck-component]').first()
    ).toBeVisible({ timeout: 60_000 });

    // The shell must name the widget, so an empty drop is identifiable rather
    // than an anonymous dashed rectangle.
    await expect(
      page.frameLocator('#preview-frame').locator('[data-evershop-widget-shell]').first()
    ).toHaveAttribute('data-evershop-widget-shell', 'Coupon block');

    // Still a draft — nothing reaches the live storefront until Publish.
    const { rows: published } = await getDb().query(
      `SELECT 1 FROM puck_document WHERE route = $1`,
      [ROUTE_ID]
    );
    expect(published, 'an unpublished edit reached published state').toHaveLength(0);
  });
});
