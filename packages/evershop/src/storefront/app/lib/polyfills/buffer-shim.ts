/**
 * `Buffer` global shim for the client bundle, injected by esbuild
 * (`optimizeDeps.esbuildOptions.inject` in vite.config.ts) into every
 * dependency it pre-bundles for the browser.
 *
 * Root cause: `sanitize-html` (used client-side by `RichContent` — it runs
 * during hydration too, not just SSR, so a client-navigated page stays
 * protected) pulls in `postcss` for its style-attribute sanitization, and
 * `postcss/lib/previous-map.js` has a `if (Buffer) {...} else {
 * window.atob(...) }` fallback written for bundlers (webpack ≤4) that used
 * to auto-shim a global `Buffer`. Referencing the bare `Buffer` identifier
 * when nothing has ever declared it throws a ReferenceError before that
 * `if` can even evaluate — Vite deliberately doesn't auto-polyfill Node
 * globals, so nothing declares it here otherwise. Only reachable when the
 * sanitizer actually processes a `style="..."` attribute, hence
 * intermittent: it depends on both the page's content and how esbuild's
 * dependency scan happened to chunk that code on a given run.
 *
 * esbuild's `inject` mechanism only understands named exports — this file
 * must actually `export` the binding for esbuild to treat it as an
 * implicit import in every scanned module's scope.
 */
export { Buffer } from 'buffer';
