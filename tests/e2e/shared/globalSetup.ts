import { request, type FullConfig } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanupOrphanedTestAdmins,
  createTestAdmin,
  type TestAdmin
} from './auth.js';
import { cleanupCoupons, seedCoupon } from './couponDb.js';
import { seedCustomerAuth, writeAnonStorageState } from './customerAuth.js';
import { cleanupCustomers } from './customerDb.js';
import {
  cleanupTestChangesets,
  cleanupTestWidgets,
  closeDb
} from './db.js';
import { cleanupLandingPages, seedLandingPage } from './landingPageDb.js';
import { cleanupOrders, seedOrder } from './orderDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '..', '.auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'admin.json');
const ADMIN_META_PATH = path.join(AUTH_DIR, 'admin.meta.json');

/**
 * Global setup steps:
 *
 *   1. Sanity-check that BASE_URL is reachable. Fail loud if the dev
 *      server isn't running — tests would time out otherwise with
 *      uninformative errors.
 *   2. Sweep up orphaned `e2e-*` admin users / changesets / widgets from
 *      previous runs that didn't tear down (Ctrl-C, crash, etc.).
 *   3. Create a fresh throw-away admin user.
 *   4. Log them in via `/admin/user/login` and save the resulting
 *      session cookie as Playwright `storageState`. Specs reuse it.
 *   5. Persist the admin's id to `admin.meta.json` so globalTeardown can
 *      target the right user.
 *   6. Write `.auth/anon.json` (always) and, when `E2E_SEED_FIXTURES=1`,
 *      seed the capture fixtures: customer + session, order, coupon,
 *      landing page. Those exist purely so the capture suite can visit
 *      `/order/:uuid`, `/admin/orders/:uuid`, `/admin/customers/:uuid`,
 *      `/admin/coupons/:uuid` and `/admin/landing-pages/:uuid` with real
 *      data — `evershop seed --all` creates none of those entities. The
 *      functional specs don't need them, so they stay behind the flag.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    (config.projects[0]?.use as { baseURL?: string } | undefined)?.baseURL ??
    process.env.BASE_URL ??
    'http://localhost:3000';

  // 1. Reachability probe. Retries rather than making one 5s attempt: the
  // dev server rebuilds its webpack bundles in the background and a request
  // arriving mid-rebuild can take several seconds while the server is
  // perfectly healthy. A single short attempt turned that into a hard
  // failure telling you to start a server that was already running.
  // Still bounded, so a genuinely absent server fails in ~30s rather than
  // hanging every spec.
  const READY_BUDGET_MS = Number(process.env.E2E_READY_TIMEOUT_MS ?? 30_000);
  const deadline = Date.now() + READY_BUDGET_MS;
  let lastError = '';
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const probe = await request.newContext({ baseURL });
      const res = await probe.get('/', { timeout: 10_000 });
      await probe.dispose();
      if (res.ok()) {
        ready = true;
        break;
      }
      lastError = `responded ${res.status()}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (!ready) {
    throw new Error(
      `[e2e:globalSetup] Cannot reach BASE_URL ${baseURL} within ${READY_BUDGET_MS}ms.\n` +
        `  → Start the dev server: \`npm run dev\` from the repo root.\n` +
        `  → Last error: ${lastError}`
    );
  }

  // 2. Sweep orphans.
  await cleanupOrphanedTestAdmins();
  await cleanupTestChangesets();
  await cleanupTestWidgets();

  // 3 + 4. Create the test admin and log them in.
  mkdirSync(AUTH_DIR, { recursive: true });
  const admin: TestAdmin = await createTestAdmin();

  const ctx = await request.newContext({ baseURL });
  try {
    const loginRes = await ctx.post('/admin/user/login', {
      data: { email: admin.email, password: admin.password },
      headers: {
        'Content-Type': 'application/json',
        // `/admin/user/login` sits in the strict `auth` rate-limit tier: 8
        // requests per 15 minutes per IP. globalSetup logs in once per run, so
        // the 9th suite run inside a window fails EVERY spec with a confusing
        // "Admin login failed: 429" that looks like a broken fixture rather
        // than a rate limit. Iterating on one spec hits that easily.
        //
        // This is the limiter's own documented exemption
        // (`INTERNAL_REQUEST_HEADER` in modules/base/services/rateLimit.ts),
        // and it is honoured ONLY together with a loopback source address —
        // which the test runner always is — so it cannot weaken the limiter
        // for real traffic. Scoped to this one login rather than applied to
        // every request context, so specs still exercise the limiter normally.
        'x-evershop-internal': '1'
      }
    });
    if (!loginRes.ok()) {
      const body = await loginRes.text().catch(() => '<no body>');
      throw new Error(
        `Admin login failed: ${loginRes.status()} ${loginRes.statusText()}\n  body: ${body.substring(0, 300)}`
      );
    }
    await ctx.storageState({ path: STORAGE_STATE_PATH });
  } finally {
    await ctx.dispose();
  }

  // 5. Stash the admin id for teardown. The plaintext password is NOT
  // persisted — it's already in the storage state's cookies (encrypted
  // at-rest by the OS keychain on macOS; on CI it's fine to live in
  // .auth which gets shredded on workspace cleanup).
  writeFileSync(
    ADMIN_META_PATH,
    JSON.stringify(
      { adminUserId: admin.adminUserId, email: admin.email },
      null,
      2
    ),
    'utf8'
  );

  // 6. Capture fixtures. `anon.json` is unconditional — it costs a file
  // write and the capture projects can't start without it.
  writeAnonStorageState();

  if (process.env.E2E_SEED_FIXTURES === '1') {
    // Sweep first, for the same reason step 2 does: a run killed mid-flight
    // leaves rows behind, and the unique indexes on coupon.coupon /
    // landing_page.url_key / customer.email would otherwise be a slow leak
    // rather than a hard failure.
    await cleanupOrders();
    await cleanupCustomers();
    await cleanupCoupons();
    await cleanupLandingPages();

    // Order after customer: the order hangs off the fixture customer.
    const customer = await seedCustomerAuth(baseURL);
    await seedOrder(customer);
    await seedCoupon();
    await seedLandingPage();
  }

  // Suite-scoped pool. Specs open their own short-lived ones via getDb().
  // Closing here would force each spec to reconnect — keep it open until
  // globalTeardown.
  // (no-op; pool stays for teardown)
  void closeDb;
}
