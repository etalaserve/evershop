import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * The suite's `test` object. Import from here, not from `@playwright/test`
 * directly, so every spec gets the navigation defaults below.
 *
 * ## Why this exists
 *
 * Playwright's `page.goto()` / `page.reload()` default to
 * `waitUntil: 'load'`. The `load` event does not reliably fire against a Vite
 * dev server: Vite compiles ES modules on first request, and the page-builder
 * editor pulls ~150 of them (every widget type, twice — once for the admin
 * shell and again for the canvas iframe's separate JS realm). Navigation
 * therefore times out on pages that are already fully painted and
 * interactive, which is what made all 16 specs under
 * `pageBuilder/specs/03-drag-drop/` fail with
 * `page.goto: Timeout 30000ms exceeded` regardless of what they asserted.
 *
 * `domcontentloaded` is the correct signal for these SSR'd pages — the same
 * conclusion the capture suite reached independently
 * (`capture/specs/routes.capture.spec.ts`). It is not a weaker assertion in
 * practice: the specs never relied on `load`, they follow every navigation
 * with explicit readiness waits (`EditorPage.open()` waits for the topbar and
 * then the iframe's `<header>`), and those are the real signals.
 *
 * Overriding the default here rather than at ~60 call sites keeps the fix in
 * one place and applies it to specs written later. An explicit
 * `{ waitUntil: … }` at a call site still wins.
 */
function patchNavigationDefaults(page: Page): void {
  const goto = page.goto.bind(page);
  page.goto = ((url: string, opts = {}) =>
    goto(url, { waitUntil: 'domcontentloaded', ...opts })) as typeof page.goto;

  const reload = page.reload.bind(page);
  page.reload = ((opts = {}) =>
    reload({ waitUntil: 'domcontentloaded', ...opts })) as typeof page.reload;
}

export const test = base.extend({
  // Patch the default page...
  page: async ({ page }, use) => {
    patchNavigationDefaults(page);
    await use(page);
  },
  // ...and any page a spec opens itself. Several specs drive a second tab
  // (e.g. 06-publish/session-picker-after-edit.spec.ts opens `page2` to prove
  // the picker surfaces in a fresh session); those would otherwise keep the
  // unpatched `load` default and hang exactly like the originals.
  context: async ({ context }, use) => {
    const newPage = context.newPage.bind(context);
    context.newPage = (async () => {
      const p = await newPage();
      patchNavigationDefaults(p);
      return p;
    }) as BrowserContext['newPage'];
    await use(context);
  }
});

export { expect };

// Re-exported so a spec can keep a single import line for both `test` and the
// types it annotates helpers with.
export type {
  APIRequestContext,
  BrowserContext,
  FrameLocator,
  Locator,
  Page
} from '@playwright/test';
