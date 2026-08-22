import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';

/**
 * One active coupon so `/admin/coupons/:uuid` has a row to edit.
 *
 * The code is `e2e-<hex>` — unique index on `coupon.coupon`, so a re-run
 * that didn't clean up can't collide.
 */

export interface TestCoupon {
  couponId: number;
  uuid: string;
  code: string;
}

export async function seedCoupon(): Promise<TestCoupon> {
  const db = getDb();
  const code = `e2e-${randomUUID().replace(/-/g, '').slice(0, 10)}`;

  // discount_type '1' is the column default (fixed amount off the order);
  // it's stored as a varchar, not an enum or int. The validity window is
  // open now and closes in a year so the admin form shows an *active*
  // coupon rather than an expired one.
  const { rows } = await db.query<{ coupon_id: number; uuid: string }>(
    `INSERT INTO coupon
       (coupon, description, discount_amount, discount_type, status,
        free_shipping, max_uses_time_per_coupon, max_uses_time_per_customer,
        start_date, end_date)
     VALUES ($1, 'E2E fixture coupon — $10 off', 10, '1', true, false,
             100, 1, NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year')
     RETURNING coupon_id, uuid`,
    [code]
  );
  return { couponId: rows[0].coupon_id, uuid: rows[0].uuid, code };
}

/** Sweep every `e2e-` coupon. Nothing references coupon rows by FK. */
export async function cleanupCoupons(): Promise<void> {
  const db = getDb();
  await db.query(`DELETE FROM coupon WHERE coupon LIKE 'e2e-%'`);
}
