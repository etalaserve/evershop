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
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()]
});
