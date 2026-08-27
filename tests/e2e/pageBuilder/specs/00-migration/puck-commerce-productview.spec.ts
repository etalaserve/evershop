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
 * Commerce furniture on the product page, and the guarantee that protects it.
 *
 * A PDP's gallery, price and buy button become Puck components so the page is
 * fully composable. Two things then have to hold, and they pull against each
 * other:
 *
 *  - the components must render the REAL product, since they have no settings
 *    and everything they show comes from page metadata; and
 *  - the buy button must not be removable, because a product page without one
 *    cannot be bought from — which is not a layout choice a merchant should be
 *    able to make by accident.
 */

const ROUTE_ID = 'productView';

async function firstProduct(): Promise<{ urlKey: string; sku: string } | null> {
  const { rows } = await getDb().query<{ url_key: string; sku: string }>(
    `SELECT d.url_key, p.sku
       FROM product p JOIN product_description d ON d.product_description_product_id = p.product_id
      WHERE p.status = true
      LIMIT 1`
  );
  return rows[0] ? { urlKey: rows[0].url_key, sku: rows[0].sku } : null;
}

function documentWith(types: string[]) {
  return {
    root: { props: {} },
    content: types.map((type) => ({ type, props: { id: randomUUID() } }))
  };
}

async function postDocument(
  request: APIRequestContext,
  changesetId: number,
  types: string[]
) {
  return request.post(`/api/page-builder/changesets/${changesetId}/operations`, {
    data: {
      route: ROUTE_ID,
      entity_urn: `urn:evershop:cms:puck_document:${randomUUID()}`,
      old_payload: null,
      new_payload: { route: ROUTE_ID, scope_urn: null, data: documentWith(types) },
      change_order: 0
    }
  });
}

test.describe('productView commerce furniture', () => {
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

  test('the buy button cannot be removed, at write or at publish', async ({ request }) => {
    // The plan's negative test: delete ProductAddToCart via the raw op
    // endpoint and be refused. The endpoint is what matters — Puck's own
    // `permissions: { delete: false }` is a UI affordance and this is
    // reachable directly.
    await discardAdminChangesets(adminUserId());
    expect((await request.get(`/admin/page-builder/edit/${ROUTE_ID}`)).ok()).toBe(true);
    const changesetId = (await getActiveChangesetId(adminUserId()))!;

    const without = await postDocument(request, changesetId, [
      'product_gallery',
      'product_price'
    ]);
    expect(without.status(), 'a PDP without add-to-cart was accepted').toBe(400);
    expect(await without.text()).toContain('product_add_to_cart');

    // Nothing was staged, so there is nothing to publish either — the write
    // gate is what keeps the changeset always publishable.
    const staged = await getDb().query(
      `SELECT 1 FROM changeset_operation WHERE changeset_id = $1`,
      [changesetId]
    );
    expect(staged.rows, 'the rejected write still left an operation').toHaveLength(0);

    // A document that keeps the button is accepted and publishes.
    const withButton = await postDocument(request, changesetId, [
      'product_gallery',
      'product_price',
      'product_add_to_cart'
    ]);
    expect(withButton.status()).toBe(201);

    const pub = await request.post(`/api/page-builder/changesets/${changesetId}/publish`);
    expect(pub.ok(), `publish failed: ${pub.status()}`).toBe(true);
  });

  test('the components render the real product', async ({ request }) => {
    const product = await firstProduct();
    test.skip(!product, 'no active product in this store');

    await discardAdminChangesets(adminUserId());
    expect((await request.get(`/admin/page-builder/edit/${ROUTE_ID}`)).ok()).toBe(true);
    const changesetId = (await getActiveChangesetId(adminUserId()))!;

    expect(
      (
        await postDocument(request, changesetId, [
          'product_gallery',
          'product_price',
          'product_add_to_cart'
        ])
      ).status()
    ).toBe(201);
    expect((await request.post(`/api/page-builder/changesets/${changesetId}/publish`)).ok()).toBe(true);

    const res = await request.get(`/product/${product!.urlKey}?__engine=puck`);
    expect(res.ok()).toBe(true);
    const html = await res.text();

    // The buy button, drawn from the product rather than from settings.
    expect(html).toContain('Add to cart');
    expect(html).toContain('Increase quantity');

    // And NOT the edit-mode placeholder: that appears when metadata carries no
    // product, which is exactly the failure this wiring could regress into
    // while still looking fine in the editor.
    expect(
      html,
      'commerce components fell back to their placeholder on a real product page'
    ).not.toContain('shown on the live product page');
  });
});
