import { request } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedCustomer, type TestCustomer } from './customerDb.js';

/**
 * Storefront-customer counterpart to `auth.ts` + globalSetup's admin login.
 *
 * The customer row is inserted directly (bcrypt hash via `customerDb`), but
 * the session is obtained by POSTing the REAL login endpoint, so the cookie
 * we save is one the app itself issued — a hand-forged session cookie would
 * pass here and fail against every middleware that reads it.
 *
 * Endpoint is `/customer/login`, NOT `/api/customer/login`: the handler
 * lives under `modules/customer/pages/frontStore/customerLoginJson`, and
 * `pages/*` routes are mounted at their bare path. Only `api/*` routes get
 * the `/api` prefix.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '..', '.auth');
const CUSTOMER_STATE_PATH = path.join(AUTH_DIR, 'customer.json');
const ANON_STATE_PATH = path.join(AUTH_DIR, 'anon.json');

/**
 * The capture projects run one project per auth state, so the anonymous
 * project needs a storageState file too — Playwright has no "explicitly no
 * state" value, and pointing it at a missing path is an error. An empty but
 * valid state is the answer. Free to write, so globalSetup does it even when
 * fixture seeding is switched off.
 */
export function writeAnonStorageState(): void {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(
    ANON_STATE_PATH,
    JSON.stringify({ cookies: [], origins: [] }),
    'utf8'
  );
}

/**
 * Create the fixture customer and save their logged-in session to
 * `.auth/customer.json`. Returns the customer so the caller can hand it to
 * `seedOrder()` — the order needs the same account holder.
 */
export async function seedCustomerAuth(
  baseURL: string
): Promise<TestCustomer> {
  mkdirSync(AUTH_DIR, { recursive: true });
  const customer = await seedCustomer();

  const ctx = await request.newContext({ baseURL });
  try {
    const res = await ctx.post('/customer/login', {
      data: { email: customer.email, password: customer.password },
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok()) {
      const body = await res.text().catch(() => '<no body>');
      throw new Error(
        `Customer login failed: ${res.status()} ${res.statusText()}\n  body: ${body.substring(0, 300)}`
      );
    }
    await ctx.storageState({ path: CUSTOMER_STATE_PATH });
  } finally {
    await ctx.dispose();
  }

  return customer;
}
