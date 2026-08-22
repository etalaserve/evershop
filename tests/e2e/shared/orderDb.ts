import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';
import { type TestCustomer } from './customerDb.js';

/**
 * A placed order, built the way checkout would leave it — not the minimum
 * that satisfies NOT NULL. `/order/:uuid` and `/admin/orders/:uuid` both
 * render totals, a line item with a thumbnail, an address and a status
 * badge, so all of those have to be real or the captured screenshot shows
 * an empty shell.
 *
 * Money is computed from a real seeded product rather than hard-coded, so
 * the sub-total/grand-total arithmetic on screen actually adds up.
 *
 * Cleanup hook: `customer_email` carries the `e2e-` prefix, same as every
 * other fixture here.
 */

export interface TestOrder {
  orderId: number;
  uuid: string;
  orderNumber: string;
  cartId: number;
}

/** Flat shipping fee, incl. tax — no tax is modelled (tax_percent 0). */
const SHIPPING_FEE = 5;
const QTY = 2;

export async function seedOrder(customer: TestCustomer): Promise<TestOrder> {
  const db = getDb();

  const { rows: products } = await db.query<{
    product_id: number;
    sku: string;
    price: string;
    name: string;
    thumbnail: string | null;
  }>(
    `SELECT p.product_id, p.sku, p.price, pd.name, pi.origin_image AS thumbnail
     FROM product p
     JOIN product_description pd
       ON pd.product_description_product_id = p.product_id
     LEFT JOIN product_image pi
       ON pi.product_image_product_id = p.product_id AND pi.is_main = true
     WHERE p.status = true
     ORDER BY p.product_id
     LIMIT 1`
  );
  if (products.length === 0) {
    throw new Error(
      'No enabled product found — run `evershop seed --all` before seeding the order fixture.'
    );
  }
  const product = products[0];

  const unitPrice = Number(product.price);
  const lineTotal = unitPrice * QTY;
  const grandTotal = lineTotal + SHIPPING_FEE;
  const orderNumber = `E2E${Date.now()}${Math.floor(Math.random() * 100)}`;

  // `order.cart_id` is NOT NULL but carries no foreign key, so a literal
  // would technically pass. We insert a real (completed) cart anyway: the
  // admin order screen and several oms services join back to it, and a
  // dangling id would surface as a confusing null rather than a fixture bug.
  const { rows: carts } = await db.query<{ cart_id: number }>(
    `INSERT INTO cart
       (sid, currency, customer_id, customer_group_id, customer_email,
        customer_full_name, status, sub_total, sub_total_incl_tax,
        sub_total_with_discount, sub_total_with_discount_incl_tax,
        total_qty, tax_amount, tax_amount_before_discount,
        shipping_tax_amount, shipping_fee_excl_tax, shipping_fee_incl_tax,
        grand_total, payment_method, payment_method_name)
     VALUES ($1, 'USD', $2, 1, $3, $4, false, $5, $5, $5, $5, $6,
             0, 0, 0, $7, $7, $8, 'cod', 'Cash On Delivery')
     RETURNING cart_id`,
    [
      randomUUID(),
      customer.customerId,
      customer.email,
      customer.fullName,
      lineTotal,
      QTY,
      SHIPPING_FEE,
      grandTotal
    ]
  );
  const cartId = carts[0].cart_id;

  // order_address has no FK from `order` and no cascade — both ids are
  // collected and deleted explicitly in cleanupOrders(). Province is the
  // ISO-3166-2 code; the GraphQL Province resolver maps it to a display name
  // and yields 'INVALID_PROVINCE' for anything it can't find.
  const { rows: addresses } = await db.query<{ order_address_id: number }>(
    `INSERT INTO order_address
       (full_name, telephone, address_1, city, province, country, postcode)
     VALUES ($1, '+1 555 0100', '1 Test Plaza', 'San Francisco',
             'US-CA', 'US', '94103')
     RETURNING order_address_id`,
    [customer.fullName]
  );
  const addressId = addresses[0].order_address_id;

  // status is derived from payment_status + shipment_status via the
  // `oms.order.psoMapping` config; 'paid' + 'pending' maps to 'processing',
  // so that triple is written together to stay self-consistent.
  //
  // shipping_method_data is the JSONB the shipping rework introduced; the
  // storefront reads the display name from `snapshot.name` only, but the
  // provider/method codes are snake_case there (Order.resolvers camelCases
  // them on the way out) — matching what checkout writes.
  const { rows } = await db.query<{ order_id: number; uuid: string }>(
    `INSERT INTO "order"
       (order_number, status, cart_id, currency, customer_id, customer_email,
        customer_full_name, sub_total, sub_total_incl_tax,
        sub_total_with_discount, sub_total_with_discount_incl_tax,
        total_qty, tax_amount, tax_amount_before_discount,
        shipping_tax_amount, total_tax_amount, discount_amount,
        shipping_fee_excl_tax, shipping_fee_incl_tax, grand_total,
        shipping_address_id, billing_address_id,
        payment_method, payment_method_name, payment_status, shipment_status,
        shipping_method_data)
     VALUES ($1, 'processing', $2, 'USD', $3, $4, $5, $6, $6, $6, $6, $7,
             0, 0, 0, 0, 0, $8, $8, $9, $10, $10,
             'cod', 'Cash On Delivery', 'paid', 'pending', $11::jsonb)
     RETURNING order_id, uuid`,
    [
      orderNumber,
      cartId,
      customer.customerId,
      customer.email,
      customer.fullName,
      lineTotal,
      QTY,
      SHIPPING_FEE,
      grandTotal,
      addressId,
      JSON.stringify({
        provider_code: 'flat_rate',
        method_code: 'flat_rate',
        snapshot: { name: 'Flat Rate', cost: SHIPPING_FEE },
        quotedAt: new Date().toISOString()
      })
    ]
  );
  const orderId = rows[0].order_id;

  await db.query(
    `INSERT INTO order_item
       (order_item_order_id, product_id, product_sku, product_name, thumbnail,
        product_price, product_price_incl_tax, qty, final_price,
        final_price_incl_tax, tax_percent, tax_amount,
        tax_amount_before_discount, discount_amount, line_total,
        line_total_with_discount, line_total_incl_tax,
        line_total_with_discount_incl_tax)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $6, $6, 0, 0, 0, 0, $8, $8, $8, $8)`,
    [
      orderId,
      product.product_id,
      product.sku,
      product.name,
      product.thumbnail,
      unitPrice,
      QTY,
      lineTotal
    ]
  );

  // The admin order screen shows an activity timeline; one entry stops it
  // rendering as an empty panel.
  await db.query(
    `INSERT INTO order_activity (order_activity_order_id, comment, customer_notified)
     VALUES ($1, 'Order placed by the e2e fixture seeder.', false)`,
    [orderId]
  );

  return { orderId, uuid: rows[0].uuid, orderNumber, cartId };
}

/**
 * Drop every fixture order and everything hanging off it.
 *
 * order_item / order_activity / payment_transaction / shipment all cascade
 * on their `*_order_id` FK. order_address does NOT — there is no FK at all
 * between `order` and `order_address` — so the address ids are read out
 * first and deleted after the orders. Carts have no FK from `order` either,
 * and are matched on the same `e2e-` email marker.
 *
 * Idempotent: safe to call when there is nothing to delete.
 */
export async function cleanupOrders(): Promise<void> {
  const db = getDb();
  const { rows } = await db.query<{
    shipping_address_id: number | null;
    billing_address_id: number | null;
  }>(
    `SELECT shipping_address_id, billing_address_id FROM "order"
     WHERE customer_email LIKE 'e2e-%@evershop-e2e.invalid'`
  );
  const addressIds = rows
    .flatMap((r) => [r.shipping_address_id, r.billing_address_id])
    .filter((id): id is number => typeof id === 'number');

  await db.query(
    `DELETE FROM "order" WHERE customer_email LIKE 'e2e-%@evershop-e2e.invalid'`
  );
  if (addressIds.length > 0) {
    await db.query(
      `DELETE FROM order_address WHERE order_address_id = ANY($1::int[])`,
      [[...new Set(addressIds)]]
    );
  }
  await db.query(
    `DELETE FROM cart WHERE customer_email LIKE 'e2e-%@evershop-e2e.invalid'`
  );
}
