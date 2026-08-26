import { randomUUID } from 'node:crypto';
import { expect, test } from '../../../shared/test.js';
import { getDb } from '../../../shared/db.js';
import { backfillPuckDocuments } from '../../../../../packages/evershop/dist/lib/puck/convert/backfillPuckDocuments.js';

/**
 * Global widgets (`widget_placement.route = 'all'`) have no home in the Puck
 * document model.
 *
 * The widget model lets one placement target every route at once. The document
 * model is keyed by route, and `loadPuckDocument` looks a document up by the
 * concrete route being rendered — so an `all` document is written and then
 * never read. A merchant's site-wide announcement bar would silently vanish
 * from every page at cutover.
 *
 * The byte-diff harness cannot catch this: it compares the two pipelines on
 * whatever content the store has, and a store with no global placements shows
 * no difference. This spec seeds the case on purpose, which is the only way
 * the gap becomes visible.
 *
 * The migration therefore REPORTS it rather than pretending to handle it.
 * Designing globals for the document model (a merged `all` document, or
 * duplication into every route) is a product decision, not something to invent
 * silently inside a converter.
 */

test.describe('global widgets are reported, not silently lost', () => {
  test('backfill flags a route=all placement as unreadable', async () => {
    const db = getDb();
    const marker = `e2e-global-${randomUUID().slice(0, 8)}`;

    const documentsBefore = (
      await db.query(`SELECT route, scope_urn, theme, data FROM puck_document`)
    ).rows;

    try {
      await db.query(
        `WITH w AS (
           INSERT INTO widget_instance (name, type, settings, status)
           VALUES ($1, 'coupon_block',
             '{"heading":"Site wide","code":"GLOBAL1","variant":"card"}'::jsonb, true)
           RETURNING widget_instance_id)
         INSERT INTO widget_placement (widget_instance_id, route, area, sort_order)
         SELECT widget_instance_id, 'all', 'content', 100 FROM w`,
        [`${marker}-global`]
      );

      const report = await backfillPuckDocuments(db as never);

      // Converted, not dropped — destroying it would be worse, and it is what
      // a future globals design would build on.
      const asDocument = report.documents.find(
        (d: { route: string }) => d.route === 'all'
      );
      expect(asDocument, 'the global placement was dropped entirely').toBeTruthy();

      // ...but reported, because nothing will ever read it.
      expect(
        report.unreadable,
        'a global placement must be reported as unreadable'
      ).toHaveLength(1);
      expect(report.unreadable[0]).toMatchObject({
        route: 'all',
        reason: 'global-route'
      });

      // The gap itself, stated as an assertion: no per-route document picked
      // this content up, so every route it used to appear on now lacks it.
      const perRoute = report.documents.filter(
        (d: { route: string }) => d.route !== 'all'
      );
      for (const d of perRoute) {
        expect(
          d.route,
          'if globals ever get merged into routes, this expectation changes'
        ).not.toBe('all');
      }
    } finally {
      await db.query(`DELETE FROM widget_instance WHERE name LIKE $1`, [`${marker}-%`]);
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
