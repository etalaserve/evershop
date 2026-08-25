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
 * Every route that mounts a widget area is covered. "Byte-diff green on all
 * routes" is a hard pre-merge gate for the big-bang cutover: because
 * everything switches at once, there is no per-route flag to fall back to.
 */

interface RouteCase {
  routeId: string;
  /**
   * Resolve the route to a concrete URL against the live store. Returns null
   * when this store has no suitable entity, which SKIPS rather than passes —
   * a route silently dropping out of the matrix is exactly how a gate stops
   * meaning anything.
   */
  resolvePath: (
    db: ReturnType<typeof getDb>
  ) => Promise<string | null>;
  /** Set when the route can't be fetched anonymously; skipped with this reason. */
  skip?: string;
}

async function firstValue(
  db: ReturnType<typeof getDb>,
  sql: string
): Promise<string | null> {
  const { rows } = await db.query<{ value: string }>(sql);
  return rows[0]?.value ?? null;
}

const ROUTES: RouteCase[] = [
  { routeId: 'homepage', resolvePath: async () => '/' },
  { routeId: 'cart', resolvePath: async () => '/cart' },
  { routeId: 'blogHome', resolvePath: async () => '/blog' },
  { routeId: 'catalogSearch', resolvePath: async () => '/search?keyword=a' },
  {
    routeId: 'cmsPageView',
    resolvePath: (db) =>
      firstValue(
        db,
        `SELECT '/page/' || url_key AS value FROM cms_page_description LIMIT 1`
      )
  },
  // NOTE: `/category/<urlKey>` and `/product/<urlKey>`, NOT the pretty
  // `url_rewrite` path (`/kids`). Only the former are in `MIGRATED_PATHS`;
  // the rewritten paths a shopper actually follows still fall through to the
  // legacy pipeline. Using those here made both sides render legacy markup,
  // so the comparison passed while testing nothing — the seeded content was
  // present on both sides because the LEGACY renderer drew it.
  {
    routeId: 'categoryView',
    resolvePath: (db) =>
      firstValue(
        db,
        `SELECT '/category/' || url_key AS value FROM category_description LIMIT 1`
      )
  },
  {
    routeId: 'productView',
    resolvePath: (db) =>
      firstValue(
        db,
        `SELECT '/product/' || url_key AS value FROM product_description LIMIT 1`
      )
  },
  {
    routeId: 'blogPostView',
    resolvePath: (db) =>
      firstValue(
        db,
        `SELECT '/blog/' || url_key AS value FROM blog_post_description LIMIT 1`
      )
  },
  {
    routeId: 'account',
    resolvePath: async () => '/account',
    // Redirects to login without a customer session, and this project carries
    // an ADMIN session, not a customer one. Covering it needs a customer
    // storageState — worth adding, but it is a fixture gap, not a converter
    // result, so it is named here rather than quietly dropped.
    skip: 'needs a customer session; this project is admin-authenticated'
  }
];

function withEngine(path: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}__engine=puck`;
}

/**
 * Reduce a rendered page to just its comparable content, normalized.
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
    // legitimately differs (one side carries `widgets`, the other `puck`)
    // without changing a single rendered pixel.
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

  // Compare the rendered body only. `<head>` carries per-render asset
  // preloads and the trailing hydration scripts differ by design.
  const main = body.match(/<body[\s\S]*<\/body>/);
  return main ? main[0] : body;
}


/**
 * Report the FIRST point where the two renders diverge, with surrounding
 * context, instead of dumping two multi-kilobyte strings.
 *
 * Whole-document equality is the right assertion, but its default failure
 * output is two walls of HTML that have to be diffed by eye — which is how a
 * genuine difference gets mistaken for noise. Naming the offset and showing a
 * window around it makes an intermittent failure diagnosable from the log
 * alone, without reproducing it.
 */
function assertSameRender(actual: string, expected: string): void {
  if (actual === expected) return;

  let i = 0;
  while (i < actual.length && i < expected.length && actual[i] === expected[i]) i++;
  const from = Math.max(0, i - 120);
  const window = 240;

  throw new Error(
    [
      `Renders diverge at offset ${i} (widget ${expected.length} bytes, puck ${actual.length} bytes).`,
      `--- widget pipeline ---`,
      expected.slice(from, from + window),
      `--- puck pipeline ---`,
      actual.slice(from, from + window)
    ].join('\n')
  );
}

test.describe('puck byte-diff: widget pipeline vs Puck pipeline', () => {
  for (const route of ROUTES) {
    test(`${route.routeId}: both engines render identical HTML`, async ({
      request
    }) => {
      test.skip(!!route.skip, route.skip);

      const db = getDb();
      const marker = `e2e-bytediff-${randomUUID().slice(0, 8)}`;

      const path = await route.resolvePath(db);
      test.skip(path === null, `no entity in this store to render ${route.routeId}`);

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

        const widgetRes = await request.get(path!);
        const puckRes = await request.get(withEngine(path!));
        expect(widgetRes.ok()).toBe(true);
        expect(puckRes.ok()).toBe(true);

        const widgetHtml = normalize(await widgetRes.text());
        const puckHtml = normalize(await puckRes.text());

        // Guard against a vacuous pass: both sides must actually contain the
        // seeded content, or two near-empty strings would compare equal.
        expect(widgetHtml).toContain('Byte diff');
        expect(puckHtml).toContain('Byte diff');

        // And both must actually be the RRv7 app. A path outside
        // `MIGRATED_PATHS` is answered by the LEGACY renderer, which ignores
        // `?__engine=puck` entirely — so both sides would render the same
        // legacy markup and the comparison would pass having tested nothing.
        // This caught exactly that on the catalog routes. `var eContext` is
        // the legacy renderer's payload and never appears in RRv7 output.
        expect(widgetHtml, 'route is served by the legacy pipeline').not.toContain(
          'var eContext'
        );
        expect(puckHtml).not.toContain('var eContext');
        assertSameRender(puckHtml, widgetHtml);
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
