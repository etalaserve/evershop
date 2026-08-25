import { randomUUID } from 'node:crypto';
import { expect, test } from '../../../shared/test.js';
import { getDb } from '../../../shared/db.js';
// The real converter, exercised rather than reimplemented — a hand-written
// expected document would only prove the test agrees with itself.
import { backfillPuckDocuments } from '../../../../../packages/evershop/dist/lib/puck/convert/backfillPuckDocuments.js';

/**
 * The byte-diff harness: render the SAME page through both pipelines and
 * compare the HTML.
 *
 * This is the core verification of the whole Puck migration. The converter
 * has to reproduce what the widget pipeline renders, and its failure mode is
 * silent — a dropped nested child, a flattened container, an inverted order —
 * none of which throws. Comparing rendered output is the only check that
 * actually catches that.
 *
 * Two properties make it trustworthy, and both are deliberate:
 *
 *  - It compares **production to production**. Neither side routes through
 *    the editor, so it cannot be fooled by an editor-only code path, and it
 *    stays valid after the editor is replaced in Phase 4.
 *  - It compares the two pipelines **at the same instant**, against the same
 *    database, rather than against a committed snapshot. Rendered markup
 *    carries live catalog data, prices and session state; a stored baseline
 *    would churn constantly and get ignored. (The committed baseline in
 *    `widget-tree-characterization.spec.ts` deliberately snapshots the widget
 *    TREE instead, which is stable — the two are complements.)
 *
 * Phase 2 covers `cmsPageView` only: a CMS page is pure content with no
 * commerce extras, which isolates the config generator and converter from the
 * data-resolution work in Phase 3. Later phases extend `ROUTES` as each one
 * starts rendering through Puck.
 */

const ROUTES = [{ routeId: 'cmsPageView', path: (urlKey: string) => `/page/${urlKey}` }];

/**
 * Reduce a rendered page to just its widget area, normalized.
 *
 * React injects per-render bookkeeping that differs between any two renders
 * of the same content and says nothing about correctness — stripping it is
 * what makes the comparison meaningful rather than perpetually red. Anything
 * stripped here is invisible to a visitor.
 */
function normalize(html: string): string {
  const body = html
    // React 19 SSR comment markers and Suspense boundary bookkeeping.
    .replace(/<!--\/?\$[^>]*-->/g, '')
    .replace(/<!---->/g, '')
    // React's own instance/state ids (`_R_`, `S:0`, `B:0`) — per-render.
    .replace(/\sid="(?:_R_[^"]*|[SBP]:\d+)"/g, '')
    // The RRv7 hydration payload: a serialized copy of loader data, which
    // legitimately differs (one side carries `widgets`, the other
    // `puckDocument`) without changing a single rendered pixel.
    .replace(/<script>window\.__reactRouter[\s\S]*?<\/script>/g, '')
    .replace(/<script[^>]*>\s*\$RC[\s\S]*?<\/script>/g, '')
    .replace(/<div hidden id="S:\d+">[\s\S]*?<\/div>/g, '')
    // Area ids are editor bookkeeping, never visible to a shopper, and the
    // nested form (`columnsContainer_<uuid>_col_<n>`) is a widget-pipeline
    // concept that Puck replaces with slots — there is no synthetic child
    // area to name. Only the ATTRIBUTE is stripped, not the element, so a
    // container that dropped or flattened a level still fails the compare.
    .replace(/\sdata-evershop-area-id="[^"]*"/g, '')
    // Whitespace between tags is not content.
    .replace(/>\s+</g, '><')
    .trim();

  // Compare the route's own content only. Page chrome (header/nav/footer) is
  // rendered identically by the route in both cases and only adds noise to a
  // failure — and the trailing hydration scripts differ per render by design.
  const article = body.match(/<article[\s\S]*?<\/article>/);
  return article ? article[0] : body;
}

test.describe('puck byte-diff: widget pipeline vs Puck pipeline', () => {
  for (const route of ROUTES) {
    test(`${route.routeId}: both engines render identical HTML`, async ({
      request
    }) => {
      const db = getDb();
      const marker = `e2e-bytediff-${randomUUID().slice(0, 8)}`;

      const { rows: pages } = await db.query<{ url_key: string }>(
        `SELECT url_key FROM cms_page_description LIMIT 1`
      );
      test.skip(pages.length === 0, 'no CMS page in this store to compare');
      const urlKey = pages[0].url_key;

      // `backfillPuckDocuments` converts EVERY route that has widgets, not
      // just this one, so cleaning up only our own route would leave stray
      // documents behind — and a stray document shadows the widget pipeline
      // for whichever route it names. Snapshot the whole (small) table and
      // restore it verbatim instead of guessing which rows were ours.
      const { rows: documentsBefore } = await db.query(
        `SELECT route, scope_urn, theme, data FROM puck_document`
      );

      try {
        // Seed content of our own rather than relying on whatever this store
        // happens to hold. Two reasons: an empty area would let the
        // comparison pass while proving nothing, and a shared dev DB should
        // not need particular content for the suite to be meaningful.
        // A container with a nested child is used deliberately — flattened
        // nesting is the conversion's most likely silent failure.
        await db.query(
          `WITH parent AS (
             INSERT INTO widget_instance (name, type, settings, status)
             VALUES ($1, 'columns', '{"columnCount":2,"gap":16}'::jsonb, true)
             RETURNING uuid, widget_instance_id),
           child AS (
             INSERT INTO widget_instance (name, type, settings, status)
             VALUES ($2, 'coupon_block',
               '{"heading":"Byte diff","code":"BD1","variant":"card","eyebrow":"DEAL"}'::jsonb, true)
             RETURNING widget_instance_id)
           INSERT INTO widget_placement (widget_instance_id, route, area, sort_order)
           SELECT parent.widget_instance_id, $3, 'content', 100 FROM parent
           UNION ALL
           SELECT child.widget_instance_id, $3,
                  'columnsContainer_' || parent.uuid || '_col_0', 100
             FROM child, parent`,
          [`${marker}-parent`, `${marker}-child`, route.routeId]
        );

        // Convert through the real backfill, so this exercises the converter
        // rather than a fixture someone wrote to match.
        const report = await backfillPuckDocuments(db as never);
        expect(report.orphaned, 'converter reported orphaned nodes').toEqual([]);

        const widgetRes = await request.get(route.path(urlKey));
        const puckRes = await request.get(`${route.path(urlKey)}?__engine=puck`);
        expect(widgetRes.ok()).toBe(true);
        expect(puckRes.ok()).toBe(true);

        const widgetHtml = normalize(await widgetRes.text());
        const puckHtml = normalize(await puckRes.text());

        // Guard against a vacuous pass: both sides must actually contain the
        // seeded content, or two near-empty strings would compare equal.
        expect(widgetHtml).toContain('Byte diff');
        expect(puckHtml).toContain('Byte diff');
        expect(puckHtml).toBe(widgetHtml);
      } finally {
        // Leave the store exactly as found. Widget placements go with the
        // instance (ON DELETE CASCADE); documents are restored from the
        // snapshot above.
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
  }
});
