import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '../../../shared/test.js';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** The throwaway admin globalSetup created and this project is signed in as. */
function adminUserId(): number {
  const meta = path.join(__dirname, '..', '..', '..', '.auth', 'admin.meta.json');
  return (JSON.parse(readFileSync(meta, 'utf8')) as { adminUserId: number }).adminUserId;
}

/**
 * The Puck editor: does it mount, does it read staged state, does it save.
 *
 * Scoped deliberately to the three things that are NEW server-side and fail
 * silently if wrong:
 *
 *  1. The editor mounts with the generated config. A config that fails to
 *     build (a slot field missing, a component with no render) throws inside
 *     Puck rather than showing an empty canvas, so mounting at all is a real
 *     assertion.
 *  2. `loadPuckDocumentForEditing` overlays the changeset. The editor must
 *     show unpublished work; if the overlay is skipped the merchant sees the
 *     published page and silently edits from the wrong baseline — the worst
 *     failure mode in the whole editor.
 *  3. Staged edits never touch published state. A changeset is a draft; if an
 *     op leaked into `puck_document` before publish, the live storefront would
 *     change under a merchant who had not pressed Publish.
 *
 * Drag-and-drop interaction is NOT covered here — that belongs with the
 * rewrite of the quarantined `03-drag-drop` specs, which drive real editor
 * gestures. This spec is about the data path underneath them.
 */

const ROUTE_ID = 'homepage';
const EDITOR = `/admin/page-builder/puck/${ROUTE_ID}`;

/** A minimal valid Puck document holding one identifiable widget. */
function documentWith(heading: string) {
  return {
    root: { props: {} },
    content: [
      {
        type: 'coupon_block',
        props: {
          id: randomUUID(),
          heading,
          code: 'STAGED1',
          variant: 'card'
        }
      }
    ]
  };
}

test.describe('puck editor', () => {
  // The editor loads Puck plus every widget component. Vite's dev server
  // transforms those on demand — ~110 module requests, ~50s before the canvas
  // is interactive on this machine. That is a dev-server property, not the
  // editor's: the legacy editor it replaces needs ~90s and 204 requests on the
  // same page. Production serves a built bundle. The default 30s timeout is
  // simply below the floor here.
  test.setTimeout(240_000);

  test.afterEach(async () => {
    await discardAdminChangesets(adminUserId());
    await getDb().query(`DELETE FROM puck_document WHERE route = $1`, [ROUTE_ID]);
  });

  test('mounts with the generated config', async ({ page }) => {
    await page.goto(EDITOR);

    // Puck's own chrome. If `buildPuckConfig()` threw — a slot field omitted,
    // a registered type with no component — the route would render its error
    // boundary instead and none of this would exist.
    await expect(page.locator('.Puck').first()).toBeVisible();

    // The header actions override is where undo/redo/publish live, and it is
    // the surface the changeset system drives. `exact` matters: Puck ships its
    // own undo/redo (aria-label "undo"), which this editor hides because its
    // history is disabled — a case-insensitive match would find those instead
    // and pass even if the override never rendered.
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Discard', exact: true })).toBeVisible();

    // Puck's own history controls must not be visible alongside ours.
    await expect(page.locator('.Puck [aria-label="undo"]')).toBeHidden();
  });

  test('shows staged changeset edits, without publishing them', async ({
    page,
    request
  }) => {
    const db = getDb();
    const heading = `Staged ${randomUUID().slice(0, 6)}`;
    const documentUuid = randomUUID();

    // Open the editor once so a draft changeset exists for this admin.
    await page.goto(EDITOR);
    await expect(page.locator('.Puck').first()).toBeVisible({ timeout: 60_000 });

    // Must be THIS admin's draft. Picking the newest unpublished changeset
    // globally finds whichever draft another admin or an earlier spec left
    // behind, and the op then lands in a changeset the editor never reads —
    // which looks exactly like a broken overlay.
    const changesetId = await getActiveChangesetId(adminUserId());
    expect(changesetId, 'the editor did not create a draft changeset').not.toBeNull();

    // Stage an edit through the real op endpoint — the same one the editor's
    // own save calls — rather than writing the row directly, so this exercises
    // the actual write path including its validation.
    const res = await request.post(
      `/api/page-builder/changesets/${changesetId}/operations`,
      {
        data: {
          route: ROUTE_ID,
          entity_urn: `urn:evershop:cms:puck_document:${documentUuid}`,
          old_payload: null,
          new_payload: {
            route: ROUTE_ID,
            scope_urn: null,
            data: documentWith(heading)
          },
          change_order: 0
        }
      }
    );
    expect(res.ok(), `staging the op failed: ${res.status()}`).toBe(true);

    // The editor must now show it — this is the overlay working.
    // Puck renders its preview inside an iframe (its default, which usefully
    // isolates storefront styles from the editor's), so the canvas content is
    // NOT in the top-level document.
    await page.goto(EDITOR);
    await expect(
      page.frameLocator('#preview-frame').getByText(heading).first()
    ).toBeVisible({ timeout: 180_000 });

    // ...and published state must be untouched. A draft that has reached
    // `puck_document` would already be live on the storefront.
    const { rows: published } = await db.query(
      `SELECT 1 FROM puck_document WHERE route = $1`,
      [ROUTE_ID]
    );
    expect(published, 'a staged edit leaked into published state').toHaveLength(0);
  });
});
