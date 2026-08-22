import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env (sibling of this config). Resolved manually so the suite works
// regardless of which cwd `npx playwright test` is invoked from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, '.env') });

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const WORKERS = Number(process.env.PLAYWRIGHT_WORKERS ?? '1');

const DESKTOP = { width: 1440, height: 900 };
const VIEWPORTS = {
  desktop: DESKTOP,
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 }
} as const;

/**
 * Which storageState each capture project runs under. `anon.json` is an empty
 * state written by globalSetup — Playwright needs a real file, not `undefined`,
 * for a project to opt out of the suite-wide admin session in `use` below.
 */
const AUTH_FILE = {
  anon: 'anon.json',
  customer: 'customer.json',
  admin: 'admin.json'
} as const;

/**
 * EverShop end-to-end test config.
 *
 * Structure:
 *   - `globalSetup` provisions a throw-away admin user, logs them in via the
 *     real `/admin/user/login` endpoint, and saves the session cookie to
 *     `.auth/admin.json` (gitignored). Specs reuse that storage state so
 *     they don't pay the login cost per test.
 *   - `globalTeardown` deletes the admin user and any leftover `e2e-*`
 *     widget instances. Safe to re-run.
 *
 * Per-spec subdirectories under `pageBuilder/specs/`, `admin/specs/`, and
 * `storefront/specs/` are auto-discovered via the `testDir` glob.
 *
 * The suite assumes the dev server is running. We deliberately do NOT spin
 * up the server here — `npm run dev` is a heavyweight operation the user
 * controls. If `BASE_URL` is unreachable globalSetup fails fast.
 */
export default defineConfig({
  testDir: '.',
  testMatch: ['**/specs/**/*.spec.ts'],
  fullyParallel: false, // Shared DB — see comment in .env.example.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: WORKERS,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  globalSetup: path.join(__dirname, 'shared/globalSetup.ts'),
  globalTeardown: path.join(__dirname, 'shared/globalTeardown.ts'),
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Pre-authenticated state seeded by globalSetup. Each test starts
    // already logged in as the throw-away admin user.
    storageState: path.join(__dirname, '.auth/admin.json')
  },
  projects: [
    /**
     * The functional suite (was `chromium`). Renamed to say what it is,
     * since the capture projects own the `<viewport>-<state>` namespace.
     * Pinned to the admin session it has always assumed.
     *
     * It deliberately does NOT run at the other viewports: tripling its
     * runtime would buy almost nothing, since these specs assert behaviour
     * and DB state rather than layout.
     */
    {
      name: 'functional',
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP },
      testIgnore: ['**/capture/**']
    },

    /**
     * The capture matrix: three viewports x three auth states.
     *
     * The auth state is a project rather than a per-test fixture because
     * storageState is applied at context creation — and because a route's
     * *content* depends on it. `/account` as an anonymous visitor is a
     * redirect to login, which is a legitimate screen worth capturing, not
     * a failure.
     */
    ...(['desktop', 'tablet', 'mobile'] as const).flatMap((viewport) =>
      (['anon', 'customer', 'admin'] as const).map((state) => ({
        name: `${viewport}-${state}`,
        testDir: path.join(__dirname, 'capture'),
        // Capturing is slower than asserting: every route is a cold
        // navigation, and against a dev server each one may compile assets
        // on demand. The functional suite's 30s is too tight for that.
        timeout: 90_000,
        // The suite-wide testMatch is anchored at `**/specs/**`, which the
        // capture tree does not sit under once testDir moves into it.
        testMatch: ['**/*.spec.ts'],
        use: {
          // A real device profile for mobile, so touch support and the UA
          // match a phone; hover-only affordances correctly stop existing.
          ...(viewport === 'mobile' ? devices['Pixel 7'] : devices['Desktop Chrome']),
          viewport: VIEWPORTS[viewport],
          storageState: path.join(__dirname, `.auth/${AUTH_FILE[state]}`)
        }
      }))
    )
  ]
});
