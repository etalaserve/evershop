/**
 * The automated half of the visual QA pass.
 *
 * A screenshot on its own proves nothing — someone has to look at it. These
 * are the defects worth failing a run over without a human in the loop:
 * things that are unambiguous, cheap to detect, and invisible in a static
 * image (a console error, a 404'd asset) or easy to miss in one (a page that
 * scrolls sideways on a phone).
 *
 * Judgement calls — whether a layout *reads* well, whether an empty state is
 * helpful — are deliberately left to the contact sheet.
 */
import type { Page, Response } from '@playwright/test';

export interface PageProblems {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  horizontalOverflow: { scrollWidth: number; innerWidth: number } | null;
  brokenImages: string[];
  placeholderText: string[];
  /** Whether React Router served this page (its asset prefix was requested). */
  servedByRRv7: boolean;
}

/**
 * Start collecting. Call before navigating; the returned function reads the
 * results after the page has settled.
 */
export function watchPage(page: Page): () => Promise<PageProblems> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  let servedByRRv7 = false;

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', (res: Response) => {
    const url = res.url();
    if (url.includes('/storefront-assets/') || url.includes('/__manifest')) {
      servedByRRv7 = true;
    }
    // Redirects and 304s are normal; only real failures count.
    if (res.status() >= 400) failedRequests.push(`${res.status()} ${url}`);
  });

  return async () => {
    const dom = await page.evaluate(() => {
      const brokenImages = [...document.images]
        .filter((i) => i.complete && i.naturalWidth === 0)
        .map((i) => i.currentSrc || i.src)
        .slice(0, 10);

      // A rendered "undefined"/"NaN"/"[object Object]" is always a bug — a
      // missing field or a botched interpolation that reached the user.
      const text = document.body?.innerText ?? '';
      const placeholderText = [...text.matchAll(/\b(undefined|NaN|\[object Object\])\b/g)]
        .map((m) => {
          const at = m.index ?? 0;
          return text.slice(Math.max(0, at - 40), at + 40).replace(/\s+/g, ' ').trim();
        })
        .slice(0, 5);

      return {
        brokenImages,
        placeholderText,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      };
    });

    return {
      consoleErrors,
      pageErrors,
      failedRequests,
      // A 1px slack absorbs sub-pixel rounding at fractional device ratios;
      // anything past that is a real sideways scroll.
      horizontalOverflow:
        dom.scrollWidth > dom.innerWidth + 1
          ? { scrollWidth: dom.scrollWidth, innerWidth: dom.innerWidth }
          : null,
      brokenImages: dom.brokenImages,
      placeholderText: dom.placeholderText,
      servedByRRv7
    };
  };
}

/** Human-readable failure list; empty means the page is clean. */
export function describeProblems(p: PageProblems): string[] {
  const out: string[] = [];
  if (p.horizontalOverflow) {
    out.push(
      `horizontal overflow: content is ${p.horizontalOverflow.scrollWidth}px wide in a ${p.horizontalOverflow.innerWidth}px viewport`
    );
  }
  for (const e of p.pageErrors) out.push(`uncaught error: ${e}`);
  for (const e of p.consoleErrors) out.push(`console error: ${e}`);
  for (const r of p.failedRequests) out.push(`request failed: ${r}`);
  for (const i of p.brokenImages) out.push(`broken image: ${i}`);
  for (const t of p.placeholderText) out.push(`placeholder text rendered: "${t}"`);
  return out;
}
