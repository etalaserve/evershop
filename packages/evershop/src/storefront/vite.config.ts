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
