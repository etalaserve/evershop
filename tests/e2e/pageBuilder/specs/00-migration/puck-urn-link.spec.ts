import { randomUUID } from 'node:crypto';
import { expect, test } from '../../../shared/test.js';
import { getDb } from '../../../shared/db.js';
import { backfillPuckDocuments } from '../../../../../packages/evershop/dist/lib/puck/convert/backfillPuckDocuments.js';

/**
 * Acceptance test for URN link resolution on the Puck render path.
 *
 * Link-valued settings can hold URNs (`urn:evershop:catalog:category:<uuid>`)
 * — that is what the legacy LinkPicker writes and what theme manifests ship.
 * The RRv7 storefront reads `rawSettings` directly, so nothing ever resolved
 * them and a URN reached the browser as a broken `href`. This asserts the Puck
 * path resolves it to the entity's current `url_rewrite` path.
 *
 * Resolution is deliberately render-path-only: the editor keeps the raw URN,
 * because resolving before it reads them would mean saving persists the
 * resolved URL and the link stops tracking the entity. That is exactly what
 * makes the merchant-facing behaviour work — rename a category and every
 * widget linking to it picks up the new URL with no widget edits.
 *
 * NOTE ON SCOPE: the widget pipeline is knowingly NOT fixed
 * (`07-gap/urn-link` covers that path and stays red until cutover). Fixing it
 * there would be discarded at cutover, and the naive fix — resolving inside
 * the `rawSettings` resolver — is actively wrong, since the settings drawer
 * edits that same field.
 */

const ROUTE_ID = 'cmsPageView';

test.describe('puck render path: URN links', () => {
  test('resolves a category URN to its current url_rewrite path', async ({
    request
  }) => {
    const db = getDb();
    const marker = `e2e-puckurn-${randomUUID().slice(0, 8)}`;

    const { rows: pages } = await db.query<{ url_key: string }>(
      `SELECT url_key FROM cms_page_description LIMIT 1`
    );
    test.skip(pages.length === 0, 'no CMS page in this store to render into');
    const urlKey = pages[0].url_key;

    // Pick a real category that actually has a url_rewrite, so the expected
    // href comes from the database rather than being hard-coded to whatever
    // the resolver happens to produce.
    const { rows: cats } = await db.query<{
      entity_uuid: string;
      request_path: string;
    }>(
      `SELECT c.uuid AS entity_uuid, r.request_path
         FROM category c
         JOIN url_rewrite r ON r.entity_uuid = c.uuid
        WHERE r.entity_type = 'category'
        LIMIT 1`
    );
    test.skip(cats.length === 0, 'no category with a url_rewrite in this store');
    const { entity_uuid: categoryUuid, request_path: expectedPath } = cats[0];
    const urn = `urn:evershop:catalog:category:${categoryUuid}`;

    const documentsBefore = (
      await db.query(`SELECT route, scope_urn, theme, data FROM puck_document`)
    ).rows;

    try {
      await db.query(
        `WITH w AS (
           INSERT INTO widget_instance (name, type, settings, status)
           VALUES ($1, 'coupon_block', $2::jsonb, true)
           RETURNING widget_instance_id)
         INSERT INTO widget_placement (widget_instance_id, route, area, sort_order)
         SELECT widget_instance_id, $3, 'content', 100 FROM w`,
        [
          `${marker}-coupon`,
          JSON.stringify({
            heading: 'Urn link',
            code: 'URN1',
            variant: 'card',
            ctaLabel: 'Browse',
            ctaLink: urn
          }),
          ROUTE_ID
        ]
      );

      const report = await backfillPuckDocuments(db as never);
      expect(report.orphaned, 'converter reported orphaned nodes').toEqual([]);

      const res = await request.get(`/page/${urlKey}?__engine=puck`);
      expect(res.ok()).toBe(true);
      const full = await res.text();

      // Assert against the RENDERED markup, not the whole document. While the
      // `?__engine=puck` scaffolding exists this route's loader returns both
      // engines' data, so the RRv7 hydration payload still carries the widget
      // pipeline's raw `rawSettings` — including this URN. That payload feeds
      // the widget path, is deleted at cutover along with the scaffolding, and
      // is not what any shopper's browser renders an href from.
      const html = full.replace(
        /<script>window\.__reactRouter[\s\S]*?<\/script>/g,
        ''
      );

      // The widget must actually be on the page — otherwise "no URN present"
      // would pass vacuously.
      expect(html).toContain('Urn link');

      // The bug, stated directly: no raw URN may reach the rendered page.
      expect(html).not.toContain(urn);
      expect(html).not.toContain('urn:evershop:');

      // And it resolved to the real current path, not merely to something.
      const anchor = new RegExp(
        `<a[^>]*href="${expectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>\\s*Browse\\s*</a>`
      );
      expect(html).toMatch(anchor);
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
