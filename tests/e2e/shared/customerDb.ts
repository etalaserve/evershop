import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { getDb } from './db.js';

/**
 * Storefront customer fixture.
 *
 * Same conventions as `auth.ts` (the admin equivalent): email is
 * `e2e-<uuid>@evershop-e2e.invalid` — the `.invalid` TLD is reserved
 * (RFC 2606) so nothing can send real mail to it, and the `e2e-` prefix is
 * the cleanup hook. The password is 64 hex chars from crypto.randomBytes,
 * hashed with bcrypt at cost 10 (what `lib/util/passwordHelper` uses).
 *
 * Exists for two consumers: `/admin/customers/:uuid` needs *a* customer row
 * to render, and `orderDb.ts` needs an account holder to hang the fixture
 * order off.
 */

export interface TestCustomer {
  customerId: number;
  uuid: string;
  email: string;
  password: string;
  fullName: string;
}

const BCRYPT_COST = 10;

export async function seedCustomer(): Promise<TestCustomer> {
  const db = getDb();
  const email = `e2e-${randomUUID()}@evershop-e2e.invalid`;
  const password = randomBytes(32).toString('hex');
  const fullName = 'E2E Test Customer';

  // group_id defaults to 1, which is the only group `evershop seed` creates.
  // status is a smallint here (1 = enabled), NOT the boolean that
  // admin_user.status uses.
  const { rows } = await db.query<{ customer_id: number; uuid: string }>(
    `INSERT INTO customer (email, password, full_name, status, group_id)
     VALUES ($1, $2, $3, 1, 1)
     RETURNING customer_id, uuid`,
    [email, bcrypt.hashSync(password, BCRYPT_COST), fullName]
  );
  const customerId = rows[0].customer_id;

  // `/account/addresses` renders an empty state with no address, which is not
  // what the capture suite is after — give it one populated row. `country` is
  // the only NOT NULL column; province is the ISO-3166-2 code because the
  // Province resolver looks the display name up from `lib/locale/provinces`.
  await db.query(
    `INSERT INTO customer_address
       (customer_id, full_name, telephone, address_1, city, province, country,
        postcode, is_default)
     VALUES ($1, $2, '+1 555 0100', '1 Test Plaza', 'San Francisco',
             'US-CA', 'US', '94103', true)`,
    [customerId, fullName]
  );

  return { customerId, uuid: rows[0].uuid, email, password, fullName };
}

/**
 * Drop every `e2e-*@evershop-e2e.invalid` customer. customer_address and
 * reset_password_token cascade off customer_id, so this one delete is
 * enough. Idempotent — a crashed run leaves rows that the next setup sweeps.
 *
 * Must run AFTER `cleanupOrders()`: order rows carry customer_id but no FK,
 * so nothing stops this delete, yet leaving an order pointing at a deleted
 * customer would make `/admin/orders/:uuid` render a dangling account link.
 */
export async function cleanupCustomers(): Promise<void> {
  const db = getDb();
  await db.query(
    `DELETE FROM customer WHERE email LIKE 'e2e-%@evershop-e2e.invalid'`
  );
}
