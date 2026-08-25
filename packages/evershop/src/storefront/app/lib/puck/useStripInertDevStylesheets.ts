import { useEffect } from 'react';

/**
 * Remove stylesheet `<link>`s that the browser refused to apply.
 *
 * ## The problem
 *
 * Puck's canvas iframe reports itself READY only once every stylesheet it has
 * mirrored from the host document has fired `load` or `error`. Until then the
 * editor sits on a loading state — and READY is not cosmetic: it gates the
 * pointer-event bridging that makes drag-and-drop work across the iframe
 * boundary.
 *
 * Under Vite's dev server that never resolves. React Router emits a
 * `<link rel="stylesheet" href="/storefront-assets/app/app.css">`, but the dev
 * server answers that URL with `Content-Type: text/javascript` — it is a JS
 * module that injects the CSS as a `<style>` element instead. The browser will
 * not apply a stylesheet served as JavaScript, and for this combination it
 * fires NEITHER `load` nor `error`, so Puck's counter never completes and the
 * canvas hangs with nothing in the console to explain it.
 *
 * ## Why removing the link is safe
 *
 * In dev that link is already inert: it contributes no styles whatsoever (the
 * `<style>` element created by the module carries all of them), which is
 * exactly what `sheet === null` records. Removing it changes nothing about how
 * the page looks and lets Puck's own mirroring — which is well tested and
 * handles document replacement, HMR and viewport remounts — do its job.
 *
 * Guarded on `import.meta.env.DEV` so it cannot run against a production
 * build, where the link is real CSS, loads normally, and must stay.
 *
 * The `sheet === null` test is the precise one: a stylesheet the browser
 * accepted always exposes a `CSSStyleSheet`. A link still in flight also reads
 * null, which is why this runs on an interval for a short while rather than
 * once — a link that has genuinely loaded stops matching, and one that never
 * will keeps matching.
 */
export function useStripInertDevStylesheets(): void {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    let elapsed = 0;
    const EVERY_MS = 250;
    // Long enough for a real stylesheet on a cold dev server to finish
    // loading, short enough not to linger. After this the page is settled and
    // anything still unapplied was never going to apply.
    const LIMIT_MS = 15_000;

    const strip = () => {
      document
        .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
        .forEach((link) => {
          if (link.sheet === null && link.dataset.evershopInert !== 'checked') {
            // Mark before removing so a re-inserted link (HMR) is given a
            // fresh chance to load rather than being removed on sight.
            link.remove();
          }
        });
    };

    strip();
    const timer = setInterval(() => {
      elapsed += EVERY_MS;
      strip();
      if (elapsed >= LIMIT_MS) clearInterval(timer);
    }, EVERY_MS);

    return () => clearInterval(timer);
  }, []);
}
