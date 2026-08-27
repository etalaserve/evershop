import { expect, test } from '../../../shared/test.js';
import { getDb } from '../../../shared/db.js';

/**
 * Golden rendered HTML for every widget-bearing route.
 *
 * This exists because the cutover removes the widget pipeline, and with it the
 * two things that have guarded rendering all through this migration: the
 * byte-diff harness (which needs two live pipelines to compare) and the
 * widget-tree characterization snapshots (which need widget tables). Deleting
 * them without a replacement would leave the riskiest step of the migration
 * with no regression net at all.
 *
 * How it stays honest:
 *
 *  - While BOTH engines are live it asserts they agree, then writes the Puck
 *    output as the golden. A golden can therefore never record a state the
 *    widget pipeline disagreed with — which is the failure mode of naively
 *    snapshotting whatever the new code happens to produce.
 *  - After cutover the `__engine` parameter is gone; the same spec fetches the
 *    route plainly and diffs against the committed golden.
 *
 * It deliberately snapshots RENDERED HTML rather than the widget tree: after
 * cutover there is no tree to snapshot, and HTML is what a shopper actually
 * receives.
 */

interface RouteCase {
  routeId: string;
  resolvePath: (db: ReturnType<typeof getDb>) => Promise<string | null>;
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
      firstValue(db, `SELECT '/page/' || url_key AS value FROM cms_page_description LIMIT 1`)
  },
  {
    routeId: 'categoryView',
    resolvePath: (db) =>
      firstValue(db, `SELECT '/category/' || url_key AS value FROM category_description LIMIT 1`)
  },
  {
    routeId: 'productView',
    resolvePath: (db) =>
      firstValue(db, `SELECT '/product/' || url_key AS value FROM product_description LIMIT 1`)
  },
  {
    routeId: 'blogPostView',
    resolvePath: (db) =>
      firstValue(db, `SELECT '/blog/' || url_key AS value FROM blog_post_description LIMIT 1`)
  },
  {
    routeId: 'account',
    resolvePath: async () => '/account',
    skip: 'needs a customer session; this project is admin-authenticated'
  }
];

/**
 * Strip per-render bookkeeping. Shared in spirit with the byte-diff harness's
 * normalizer — anything removed here is invisible to a visitor and differs
 * between any two renders of identical content.
 */
export function normalize(html: string): string {
  const body = html
    .replace(/<!--\/?\$[^>]*-->/g, '')
    .replace(/<!---->/g, '')
    .replace(/\sid="(?:_R_[^"]*|[SBP]:\d+)"/g, '')
    // Loader payload: legitimately differs between engines and across the
    // cutover without changing a rendered pixel.
    .replace(/<script>window\.__reactRouter[\s\S]*?<\/script>/g, '')
    .replace(/<script[^>]*>\s*\$RC[\s\S]*?<\/script>/g, '')
    .replace(/<div hidden id="S:\d+">[\s\S]*?<\/div>/g, '')
    // Editor bookkeeping, and the nested form is a widget-pipeline concept
    // that slots replace. Only the attribute goes, never the element.
    .replace(/\sdata-evershop-area-id="[^"]*"/g, '')
    // Asset hashes change on every build and say nothing about content.
    .replace(/(\/storefront-assets\/[^"']*?)-[A-Za-z0-9_-]{8,}\.(js|css)/g, '$1.$2')
    // React Router's dev manifest version is regenerated on every dev-server
    // boot. Purely bookkeeping, and absent from a production build entirely —
    // without this the goldens fail after any restart, which would train
    // everyone to re-record them and destroy their value.
    .replace(/"version":\s*"[0-9.]+"/g, '"version":"<normalized>"')
    .replace(/>\s+</g, '><')
    .trim();

  const main = body.match(/<body[\s\S]*<\/body>/);
  return main ? main[0] : body;
}

function withEngine(path: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}__engine=puck`;
}

test.describe('golden rendered HTML', () => {
  test.setTimeout(180_000);

  for (const route of ROUTES) {
    test(`${route.routeId}: matches its golden`, async ({ request }) => {
      test.skip(!!route.skip, route.skip);

      const path = await route.resolvePath(getDb());
      test.skip(path === null, `no entity for ${route.routeId} in this store`);

      const puckRes = await request.get(withEngine(path!));
      expect(puckRes.ok(), `${path} did not render`).toBe(true);
      const puck = normalize(await puckRes.text());

      /**
       * While the widget pipeline is still reachable, prove the two agree
       * BEFORE trusting this output as a baseline. Once `?__engine` is gone
       * this fetch returns the same page and the comparison is trivially
       * true, so the check retires itself rather than needing removal.
       */
      const widgetRes = await request.get(path!);
      expect(widgetRes.ok()).toBe(true);
      const widget = normalize(await widgetRes.text());
      expect(
        puck,
        'engines disagree — refusing to record this as a golden'
      ).toBe(widget);

      expect(puck).toMatchSnapshot(`${route.routeId}.html`);
    });
  }
});
