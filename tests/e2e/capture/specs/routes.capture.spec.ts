/**
 * Visits every route in the generated inventory, screenshots it at the
 * current project's viewport, and asserts the automated checks.
 *
 * One test per URL, not one loop over all of them: a single broken page is
 * then one red test carrying its own screenshot and trace, instead of
 * aborting the run and hiding every route after it. That requires the
 * inventory at collection time, hence the top-level await — Playwright's
 * ESM loader supports it, and the inventory is a pure function of the
 * database plus the route files.
 */
import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMigratedPath } from '../../../../packages/evershop/dist/bin/lib/createStorefrontMiddleware.js';
import { describeProblems, watchPage } from '../checks.js';
import { buildInventory } from '../routeInventory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAPTURES = path.join(__dirname, '../../captures');

const inventory = await buildInventory(isMigratedPath);

/** `/admin/blog/posts/new` -> `admin-blog-posts-new`; `/` -> `home`. */
function slug(url: string): string {
  const clean = url.split('?')[0].replace(/^\/|\/$/g, '');
  return clean === '' ? 'home' : clean.replace(/\//g, '-');
}

for (const entry of inventory) {
  test(`[${entry.pipeline}] ${entry.url}`, async ({ page }, testInfo) => {
    const [vp, st] = testInfo.project.name.split('-');
    test.skip(entry.state !== st, `needs the ${entry.state} session`);
    test.skip(Boolean(entry.skipped), entry.skipped ?? '');

    const outDir = path.join(CAPTURES, st, vp);
    mkdirSync(outDir, { recursive: true });

    const read = watchPage(page);
    // `domcontentloaded`, not `load` or `networkidle`. These pages are
    // server-rendered, so the markup being screenshotted is present at
    // DOMContentLoaded; `load` additionally blocks on every JS chunk, and a
    // dev server compiles those on demand — which times out the navigation
    // while the page itself is already fully painted. `networkidle` never
    // fires at all, because the dev server holds an HMR channel open.
    // Fonts and images are then settled explicitly below, which is what
    // actually decides whether the screenshot is complete.
    const res = await page.goto(entry.url, { waitUntil: 'domcontentloaded' });
    const status = res?.status();
    await page
      .evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images]
            .filter((i) => !i.complete)
            .map((i) => i.decode().catch(() => undefined))
        );
      })
      .catch(() => undefined);

    await page.screenshot({
      path: path.join(outDir, `${slug(entry.url)}.png`),
      fullPage: true
    });

    const problems = await read();
    const failures = describeProblems(problems);

    // The gate and the route files disagreeing is itself a defect — see
    // routeInventory.ts — and it can only be observed at request time.
    if (entry.pipeline === 'rrv7' && status === 200 && !problems.servedByRRv7) {
      failures.push(
        'expected the React Router pipeline (this path matches MIGRATED_PATHS) ' +
          'but no /storefront-assets/ request was made — the legacy pipeline answered'
      );
    }

    expect(failures, `${entry.url}\n  - ${failures.join('\n  - ')}`).toEqual([]);
  });
}
