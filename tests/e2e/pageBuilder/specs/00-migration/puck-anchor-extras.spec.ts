import { randomUUID } from 'node:crypto';
import { expect, test } from '../../../shared/test.js';
import { getDb } from '../../../shared/db.js';
import { backfillPuckDocuments } from '../../../../../packages/evershop/dist/lib/puck/convert/backfillPuckDocuments.js';

/**
 * The product-anchored recommendation widgets, through both engines.
 *
 * These three types (`related_products`, `frequently_bought_together`,
 * `upsell_products`) are the one piece of extras resolution whose SHAPE
 * changed rather than just moving. Under the widget pipeline they were a
 * special case: their data comes from `PRODUCT_DETAIL_QUERY`, not a per-widget
 * query, so the product route had to remember to call
 * `mergeProductAnchorExtras` separately after `resolveWidgetExtras`. Under
 * Puck the anchor arrives as metadata, so they are three ordinary cases of the
 * same switch in `resolvePuckExtras`.
 *
 * That collapse is exactly the kind of change that fails silently — a widget
 * resolving to no products renders a bare heading, not an error. The generic
 * byte-diff harness cannot catch it either, because its fixture is a coupon
 * block with no server-resolved data at all. Hence a dedicated spec.
 *
 * Asserting the products MATCH between engines (rather than just "some
 * products appear") is what makes this meaningful: a wrong-but-populated list
 * would otherwise pass.
 */

const ROUTE_ID = 'productView';

test.describe('puck render path: product-anchored extras', () => {
  test('related_products resolves to the same products through both engines', async ({
    request
  }) => {
    const db = getDb();
    const marker = `e2e-anchor-${randomUUID().slice(0, 8)}`;

    const { rows: products } = await db.query<{ url_key: string }>(
      `SELECT url_key FROM product_description LIMIT 1`
    );
    test.skip(products.length === 0, 'no product in this store');
    // `/product/<urlKey>` is the RRv7 route; the pretty `url_rewrite` path is
    // still answered by the legacy pipeline and would ignore `?__engine=puck`.
    const path = `/product/${products[0].url_key}`;

    const documentsBefore = (
      await db.query(`SELECT route, scope_urn, theme, data FROM puck_document`)
    ).rows;

    try {
      await db.query(
        `WITH w AS (
           INSERT INTO widget_instance (name, type, settings, status)
           VALUES ($1, 'related_products',
             '{"heading":"Anchor probe","limit":4}'::jsonb, true)
           RETURNING widget_instance_id)
         INSERT INTO widget_placement (widget_instance_id, route, area, sort_order)
         SELECT widget_instance_id, $2, 'content', 150 FROM w`,
        [`${marker}-related`, ROUTE_ID]
      );

      const report = await backfillPuckDocuments(db as never);
      expect(report.orphaned).toEqual([]);

      const widgetRes = await request.get(path);
      const puckRes = await request.get(`${path}?__engine=puck`);
      expect(widgetRes.ok()).toBe(true);
      expect(puckRes.ok()).toBe(true);

      const linked = (html: string): string[] => {
        const body = html.match(/<body[\s\S]*<\/body>/)?.[0] ?? html;
        const idx = body.indexOf('Anchor probe');
        expect(idx, 'the seeded widget did not render').toBeGreaterThan(-1);
        return [
          ...body.slice(idx, idx + 4000).matchAll(/href="(\/product\/[^"]+)"/g)
        ].map((m) => m[1]);
      };

      const widgetProducts = linked(await widgetRes.text());
      const puckProducts = linked(await puckRes.text());

      // Non-empty, or "both resolved to nothing" would pass while proving the
      // anchor never arrived.
      expect(widgetProducts.length).toBeGreaterThan(0);
      // Same products, same order — the `limit` setting applies identically.
      expect(puckProducts).toEqual(widgetProducts);
    } finally {
      await db.query(`DELETE FROM widget_instance WHERE name LIKE $1`, [
        `${marker}-%`
      ]);
      await db.query(`DELETE FROM puck_document`);
      for (const doc of documentsBefore) {
        await db.query(
          `INSERT INTO puck_document (route, scope_urn, theme, data)
           VALUES ($1, $2, $3, $4)`,
          [doc.route, doc.scope_urn, doc.theme, doc.data]
        );
      }
    }
  });
});
