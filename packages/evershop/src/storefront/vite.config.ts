import { fileURLToPath } from 'node:url';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // EverShop's existing static middleware (`lib/middlewares/static.ts`) already
  // owns `/assets/*` (legacy storefront bundle) and `/admin/assets/*` (admin
  // bundle) — give this build its own prefix so it can't collide with either,
  // now or after the legacy pipeline is removed.
  base: '/storefront-assets/',
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  optimizeDeps: {
    // Pre-bundle the Puck editor. It is a large ESM package whose module
    // graph the dev server would otherwise transform one request at a time on
    // first load of the page-builder route — measured at ~45s before the
    // editor became interactive, with the canvas sitting empty the whole time
    // and no error to explain it. esbuild collapses it into a single
    // pre-bundled dependency instead. Vite only auto-discovers dependencies
    // reachable from the entry it crawls at startup, and this one is reachable
    // only from an admin route, so it has to be named explicitly.
    include: ['@puckeditor/core', '@puckeditor/core/rsc'],
    // `sanitize-html` (used client-side by `RichContent`, not just SSR) pulls
    // in `postcss` for style-attribute sanitization, and one of postcss's
    // files references the bare `Buffer` global with a pattern written for
    // bundlers that used to auto-shim it (webpack ≤4) — Vite doesn't, so it
    // throws "Buffer is not defined" the moment that code path actually
    // runs (sanitizing a `style="..."` attribute). esbuild's `inject` makes
    // every dependency it pre-bundles for the client see `Buffer` as if it
    // were declared in scope, via the shim's re-export. See buffer-shim.ts.
    esbuildOptions: {
      inject: [fileURLToPath(new URL('./app/lib/polyfills/buffer-shim.ts', import.meta.url))]
    }
  },
  server: {
    // Vite's dev server transforms each ES module on first request, not
    // ahead of time — normally invisible because requests spread out over a
    // session, but the page-builder editor loads ~150 modules in one shot
    // (all 26 widget types, since `lib/widgets/bootstrap.ts` registers every
    // type unconditionally regardless of what the page actually uses, times
    // two: once for the admin shell, again independently for the canvas
    // `<iframe>`'s own JS realm — module graphs can't be shared across an
    // iframe boundary in dev mode). On a cold cache (right after a dev-server
    // restart) that's ~150 serial cold transforms before the page finishes
    // loading. `warmup` pre-transforms the hot set in the background at
    // server startup instead, so it's already cached by the time a request
    // actually asks for it — doesn't reduce the request count, just moves
    // the transform cost off the request path.
    warmup: {
      clientFiles: [
        './app/routes/admin_.page-builder.edit.$routeId.tsx',
        './app/routes/admin_.page-builder.puck.$routeId.tsx',
        './app/lib/puck/*.ts*',
        './app/components/widgets/*.tsx',
        './app/components/page-builder-admin/*.tsx',
        './app/components/ui/*.tsx',
        './app/lib/widgets/*.ts*',
        './app/lib/page-builder/*.tsx',
        './app/lib/page-builder-admin/*.ts'
      ]
    }
  }
});
