/**
 * Builds the list of URLs the capture suite visits, and labels each one with
 * the pipeline that is expected to serve it.
 *
 * The inventory is derived rather than hand-written, because a hand-written
 * list drifts the moment a route is added and — worse — cannot express the
 * thing that actually goes wrong here. Two independent sources decide what a
 * URL does:
 *
 *   - `MIGRATED_PATHS` in bin/lib/createStorefrontMiddleware.ts, which gates
 *     whether a request reaches the React Router app at all;
 *   - the route files in src/storefront/app/routes, which decide whether the
 *     React Router app has anything to serve once it does.
 *
 * Those two can disagree in both directions, and each disagreement is a real
 * defect the suite should report rather than encode:
 *
 *   - gated in, no route file  -> the request reaches React Router and falls
 *     through to root.tsx's ErrorBoundary. There is no catch-all route, so
 *     this is a broken page, not a 404 page.
 *   - route file, not gated in -> the file is unreachable dead code and the
 *     legacy pipeline answers instead. `/checkout` is currently this.
 *
 * Dynamic segments are filled from the live database, so the suite captures
 * real pages instead of guessed slugs.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from '../shared/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROUTES_DIR = path.join(
  __dirname,
  '../../../packages/evershop/src/storefront/app/routes'
);

export type Pipeline = 'rrv7' | 'legacy' | 'broken' | 'unreachable-route-file';

export interface RouteEntry {
  /** Concrete, visitable URL (dynamic segments already substituted). */
  url: string;
  /** The pattern it came from, e.g. /product/:urlKey — for grouping/naming. */
  pattern: string;
  /** Which pipeline should answer, per the two sources above. */
  pipeline: Pipeline;
  /** Auth state required to see the real page. */
  state: 'anon' | 'customer' | 'admin';
  /** Set when a pattern could not be filled because no row exists. */
  skipped?: string;
}

/** Flat-routes filename -> URL pattern. */
export function fileToPattern(file: string): string | null {
  let name = file.replace(/\.tsx?$/, '');
  if (name.startsWith('_')) return null; // pathless layout (e.g. _index handled below)
  if (name.endsWith('.css')) return null;

  // Split on separator dots only. A dot inside [] is an escaped literal —
  // that is the whole point of the brackets — so `robots[.]txt` is one
  // segment, not two. Splitting naively on '.' yields `/robots/txt`.
  const segments = name.split(/\.(?![^[]*\])/);
  const out: string[] = [];
  for (const seg of segments) {
    if (seg === '_index') continue; // index route contributes no segment
    // A trailing underscore opts out of layout nesting; not part of the URL.
    const clean = seg.replace(/_$/, '').replace(/\[(.)\]/g, '$1');
    if (clean === '') continue;
    out.push(clean.startsWith('$') ? `:${clean.slice(1)}` : clean);
  }
  return '/' + out.join('/');
}

/** Every URL pattern the React Router app declares a file for. */
export function routeFilePatterns(): Set<string> {
  const patterns = new Set<string>();
  for (const file of readdirSync(ROUTES_DIR)) {
    if (!/\.tsx?$/.test(file)) continue;
    const p = fileToPattern(file);
    if (p) patterns.add(p);
  }
  return patterns;
}

/**
 * One real value per dynamic segment, straight from the database.
 *
 * Anything with no row is reported as skipped rather than guessed — a made-up
 * slug would capture a 404 page and quietly look like coverage.
 */
async function resolveParams(): Promise<Record<string, string | null>> {
  // A deployed instance keeps its Postgres on a private Docker network, so
  // there is nothing for pg to connect to from the host. Rather than
  // restrict the suite to whatever database happens to be reachable, allow
  // the values to be supplied directly — extracted however the caller can
  // reach that database (docker exec, a bastion, a fixture dump). This is
  // what lets the same suite capture a real deployed store instead of only
  // the local dev server.
  const fromFile = process.env.CAPTURE_PARAMS_FILE;
  if (fromFile) {
    return JSON.parse(readFileSync(fromFile, 'utf8')) as Record<string, string | null>;
  }

  const one = async (sql: string): Promise<string | null> => {
    try {
      const { rows } = await getDb().query(sql);
      return rows[0] ? String(Object.values(rows[0])[0]) : null;
    } catch {
      // A missing table or column means this entity simply isn't available
      // in this database; the caller reports it as skipped.
      return null;
    }
  };

  return {
    // product.status is boolean here, not the 0/1 integer several other
    // status columns use — comparing it to 1 raises rather than returning
    // nothing, which the catch above would silently turn into "no data".
    productUrlKey: await one(
      `SELECT url_key FROM product_description
       JOIN product ON product.product_id = product_description.product_description_product_id
       WHERE product.status = true ORDER BY product.product_id LIMIT 1`
    ),
    categoryUrlKey: await one(
      `SELECT url_key FROM category_description ORDER BY category_description_category_id LIMIT 1`
    ),
    cmsPageUrlKey: await one(
      `SELECT url_key FROM cms_page_description ORDER BY cms_page_description_cms_page_id LIMIT 1`
    ),
    blogUrlKey: await one(
      `SELECT url_key FROM blog_post_description ORDER BY blog_post_description_blog_post_id LIMIT 1`
    ),
    orderUuid: await one(`SELECT uuid FROM "order" ORDER BY order_id LIMIT 1`),
    productUuid: await one(`SELECT uuid FROM product ORDER BY product_id LIMIT 1`),
    categoryUuid: await one(`SELECT uuid FROM category ORDER BY category_id LIMIT 1`),
    collectionUuid: await one(`SELECT uuid FROM collection ORDER BY collection_id LIMIT 1`),
    attributeUuid: await one(`SELECT uuid FROM attribute ORDER BY attribute_id LIMIT 1`),
    customerUuid: await one(`SELECT uuid FROM customer ORDER BY customer_id LIMIT 1`),
    couponUuid: await one(`SELECT uuid FROM coupon ORDER BY coupon_id LIMIT 1`),
    cmsPageUuid: await one(`SELECT uuid FROM cms_page ORDER BY cms_page_id LIMIT 1`),
    blogPostUuid: await one(`SELECT uuid FROM blog_post ORDER BY blog_post_id LIMIT 1`),
    blogCategoryUuid: await one(`SELECT uuid FROM blog_category ORDER BY blog_category_id LIMIT 1`),
    blogTagUuid: await one(`SELECT uuid FROM blog_tag ORDER BY blog_tag_id LIMIT 1`),
    landingPageUuid: await one(`SELECT uuid FROM landing_page ORDER BY landing_page_id LIMIT 1`),
    routeId: 'homepage'
  };
}

/** Which resolved param fills a given pattern's placeholder. */
const PARAM_FOR: Record<string, string> = {
  '/product/:urlKey': 'productUrlKey',
  '/category/:urlKey': 'categoryUrlKey',
  '/page/:urlKey': 'cmsPageUrlKey',
  '/blog/:urlKey': 'blogUrlKey',
  '/order/:uuid': 'orderUuid',
  '/admin/products/:uuid': 'productUuid',
  '/admin/categories/:uuid': 'categoryUuid',
  '/admin/collections/:uuid': 'collectionUuid',
  '/admin/attributes/:uuid': 'attributeUuid',
  '/admin/customers/:uuid': 'customerUuid',
  '/admin/orders/:uuid': 'orderUuid',
  '/admin/coupons/:uuid': 'couponUuid',
  '/admin/cms/pages/:uuid': 'cmsPageUuid',
  '/admin/blog/posts/:uuid': 'blogPostUuid',
  '/admin/blog/categories/:uuid': 'blogCategoryUuid',
  '/admin/blog/tags/:uuid': 'blogTagUuid',
  '/admin/landing-pages/:uuid': 'landingPageUuid',
  '/admin/page-builder/edit/:routeId': 'routeId'
};

/** Patterns that need a signed-in customer to render their real content. */
const CUSTOMER_ROUTES = new Set(['/account', '/account/addresses', '/account/orders']);

/**
 * Legacy pages worth capturing that no route file declares. These only exist
 * in modules/*\/pages, so nothing above would discover them, but several are
 * the only implementation of their screen.
 */
const LEGACY_EXTRA: Array<{ url: string; state: RouteEntry['state'] }> = [
  { url: '/checkout', state: 'anon' },
  { url: '/admin/setting/catalog', state: 'admin' },
  { url: '/admin/setting/payments', state: 'admin' },
  { url: '/admin/setting/system', state: 'admin' },
  { url: '/admin/setting/theme', state: 'admin' },
  { url: '/admin/setting/shippingProviders', state: 'admin' },
  { url: '/admin/widgets', state: 'admin' },
  { url: '/admin/pages', state: 'admin' },
  { url: '/notfound', state: 'anon' }
];

export async function buildInventory(
  isMigratedPath: (p: string) => boolean
): Promise<RouteEntry[]> {
  const filePatterns = routeFilePatterns();
  const params = await resolveParams();
  const entries: RouteEntry[] = [];

  for (const pattern of [...filePatterns].sort()) {
    // Non-visual resource routes: fetched and status-checked elsewhere, not
    // worth a screenshot.
    if (pattern === '/robots.txt' || pattern === '/sitemap.xml') continue;

    let url = pattern;
    let skipped: string | undefined;
    const placeholder = pattern.match(/:(\w+)/);
    if (placeholder) {
      const key = PARAM_FOR[pattern];
      const value = key ? params[key] : null;
      if (!value) {
        skipped = `no row available for ${key ?? placeholder[1]}`;
      } else {
        url = pattern.replace(/:\w+/, value);
      }
    }

    const gated = isMigratedPath(url);
    const pipeline: Pipeline = gated ? 'rrv7' : 'unreachable-route-file';

    entries.push({
      url,
      pattern,
      pipeline,
      state: pattern.startsWith('/admin')
        ? 'admin'
        : CUSTOMER_ROUTES.has(pattern)
          ? 'customer'
          : 'anon',
      skipped
    });
  }

  for (const extra of LEGACY_EXTRA) {
    // Already discovered from a route file — it is the unreachable-route-file
    // case, which is the more specific finding of the two. Don't list it twice.
    if (entries.some((e) => e.url === extra.url)) continue;
    // A legacy URL that the gate claims for React Router has no route file,
    // so React Router has nothing to render — that is the "broken" case.
    entries.push({
      url: extra.url,
      pattern: extra.url,
      pipeline: isMigratedPath(extra.url) ? 'broken' : 'legacy',
      state: extra.state
    });
  }

  return entries;
}
