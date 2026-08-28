import { expect, test } from '../../../shared/test.js';
import { getDb } from '../../../shared/db.js';

/**
 * The money path: cart → checkout → order.
 *
 * `/checkout` moved to the RRv7 app as part of the Puck cutover, and it is the
 * one route where a regression costs real revenue. It had been quietly broken
 * for some time before that move — its loader read a `cart_id` cookie that
 * stopped being written when add-to-cart moved to the session, so every
 * shopper who reached it was redirected back to their cart. Nothing caught
 * that, because nothing exercised it.
 *
 * Driven through the same HTTP endpoints the page itself calls, rather than
 * the UI: the payment step mounts Stripe Elements, and asserting on a third
 * party's iframe would make this test about their markup rather than about
 * whether an order can be placed.
 */

const SHIPPING_COST = '5.0000';

/** A store can only take an order if a payment method and a shipping rate exist. */
async function ensureStoreCanSell(): Promise<{ createdZone: boolean }> {
  const db = getDb();

  await db.query(
    `INSERT INTO setting (name, value, is_json) VALUES ('codPaymentStatus','1',false)
     ON CONFLICT (name) DO UPDATE SET value = '1'`
  );

  const { rows: zones } = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM shipping_zone`
  );
  if (Number(zones[0].n) > 0) return { createdZone: false };

  await db.query(
    `WITH z AS (
       INSERT INTO shipping_zone (name) VALUES ('E2E Zone') RETURNING shipping_zone_id
     ), c AS (
       INSERT INTO shipping_zone_country (zone_id, country) SELECT shipping_zone_id, 'ID' FROM z
     ), p AS (
       INSERT INTO shipping_zone_provider (zone_id, provider_code, is_enabled, config, sort_order)
         SELECT shipping_zone_id, 'core', true, '{}'::jsonb, 0 FROM z
     ), m AS (
       INSERT INTO core_shipping_method (name, is_enabled, sort_order)
         VALUES ('E2E Standard', true, 0) RETURNING core_shipping_method_id
     )
     INSERT INTO core_shipping_method_rate (method_id, zone_id, is_enabled, cost, condition_type, min, max)
       SELECT m.core_shipping_method_id, z.shipping_zone_id, true, $1, 'price', 0, 1000000 FROM m, z`,
    [SHIPPING_COST]
  );
  return { createdZone: true };
}

test.describe('checkout funnel', () => {
  test.setTimeout(180_000);

  test('a shopper can add to cart, check out, and get an order', async ({ request }) => {
    const db = getDb();
    const { createdZone } = await ensureStoreCanSell();

    const { rows: products } = await db.query<{ sku: string }>(
      `SELECT sku FROM product WHERE status = true LIMIT 1`
    );
    test.skip(products.length === 0, 'no purchasable product in this store');
    const sku = products[0].sku;

    try {
      // A session must exist before the cart can attach to one — the cart is
      // identified by EverShop's `sid` cookie, and the add-to-cart API does not
      // mint it. A browser always has one; a bare API client does not.
      expect((await request.get('/')).ok()).toBe(true);

      expect(
        (await request.post('/api/cart/mine/items', { data: { sku, qty: 2 } })).ok(),
        'add to cart failed'
      ).toBe(true);

      const cart = (await (
        await request.post('/api/graphql', {
          data: { query: 'query{ myCart { uuid availablePaymentMethods { code } } }' }
        })
      ).json()) as {
        data: { myCart: { uuid: string; availablePaymentMethods: Array<{ code: string }> } | null };
      };
      expect(cart.data.myCart, 'the cart did not attach to the session').not.toBeNull();
      const cartId = cart.data.myCart!.uuid;
      expect(
        cart.data.myCart!.availablePaymentMethods.map((m) => m.code),
        'no payment method is enabled'
      ).toContain('cod');

      // The checkout PAGE must render the cart rather than bouncing to /cart.
      // This is the exact regression that went unnoticed: a redirect here looks
      // like an empty cart and reports no error anywhere.
      const page = await request.get('/checkout');
      expect(page.ok(), 'checkout did not render').toBe(true);
      expect(page.url(), 'checkout redirected away instead of rendering').toContain('/checkout');

      const shipping = (await (
        await request.post('/api/graphql', {
          data: {
            query:
              'query($id:String!,$c:String,$p:String){ cart(id:$id){ availableShippingMethods(country:$c,province:$p){ providerCode code } } }',
            variables: { id: cartId, c: 'ID', p: 'ID-JK' }
          }
        })
      ).json()) as {
        data: { cart: { availableShippingMethods: Array<{ providerCode: string; code: string }> } };
      };
      const method = shipping.data.cart.availableShippingMethods[0];
      expect(method, 'no shipping method is available').toBeTruthy();

      const address = {
        full_name: 'E2E Shopper',
        address_1: '1 Test St',
        city: 'Jakarta',
        province: 'ID-JK',
        country: 'ID',
        postcode: '12345',
        telephone: '0800000000'
      };
      const placed = await request.post(`/api/carts/${cartId}/checkout`, {
        data: {
          cart_id: cartId,
          customer: { email: 'e2e-shopper@test.com' },
          shippingAddress: address,
          billingAddress: address,
          shippingMethod: method.code,
          shippingProvider: method.providerCode,
          paymentMethod: 'cod'
        }
      });
      expect(placed.ok(), `placing the order failed: ${placed.status()}`).toBe(true);
      const order = (await placed.json()) as { data: { uuid: string; order_number: string } };

      // The order must exist in the database — an API response saying "ok" is
      // not the same as an order a merchant can fulfil.
      const { rows: saved } = await db.query<{ payment_method: string; grand_total: string }>(
        `SELECT payment_method, grand_total FROM "order" WHERE uuid = $1`,
        [order.data.uuid]
      );
      expect(saved, 'the order was not persisted').toHaveLength(1);
      expect(saved[0].payment_method).toBe('cod');

      const { rows: items } = await db.query(
        `SELECT 1 FROM order_item oi
           JOIN "order" o ON o.order_id = oi.order_item_order_id
          WHERE o.uuid = $1`,
        [order.data.uuid]
      );
      expect(items, 'the order has no line items').not.toHaveLength(0);

      // The confirmation page a shopper lands on must work.
      expect((await request.get(`/order/${order.data.uuid}`)).ok()).toBe(true);

      // And the cart is consumed, so a refresh cannot double-order.
      const after = (await (
        await request.post('/api/graphql', { data: { query: 'query{ myCart { uuid } }' } })
      ).json()) as { data: { myCart: unknown } };
      expect(after.data.myCart, 'the cart survived checkout').toBeNull();
    } finally {
      await db.query(
        `DELETE FROM "order" WHERE customer_email = 'e2e-shopper@test.com'`
      );
      if (createdZone) {
        await db.query(`DELETE FROM core_shipping_method WHERE name = 'E2E Standard'`);
        await db.query(`DELETE FROM shipping_zone WHERE name = 'E2E Zone'`);
      }
    }
  });
});
