/**
 * Session-based cart calls — the anonymous cart is identified by EverShop's
 * own `sid` cookie (same-origin now that the storefront is in-process, so
 * the browser sends it automatically on every fetch here), not a cart id
 * this storefront invents itself. Replaces an earlier `cart_id` cookie +
 * `/api/carts` design built for a cross-origin deployment — those REST
 * endpoints never existed on EverShop's backend. The real ones
 * (`/cart/mine/items`, checkout/api/{add,remove,updateMine}CartItem*) all
 * resolve "my cart" from the session the same way `myCart` (the GraphQL
 * query `routes/cart.tsx` reads) does — see
 * `customer/api/global/[context]getCurrentCustomer[auth].js`.
 */

async function parseOrThrow(res: Response): Promise<any> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'Something went wrong');
  }
  return body.data;
}

export async function addToCart(sku: string, qty: number): Promise<void> {
  const res = await fetch('/api/cart/mine/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, qty })
  });
  await parseOrThrow(res);
}

export async function removeCartItem(itemUuid: string): Promise<void> {
  const res = await fetch(`/api/cart/mine/items/${itemUuid}`, { method: 'DELETE' });
  await parseOrThrow(res);
}

/** qty is the increment/decrement step (usually 1), not the new absolute quantity — see updateCartItemQty.ts. */
export async function updateCartItemQty(
  itemUuid: string,
  action: 'increase' | 'decrease',
  qty = 1
): Promise<void> {
  const res = await fetch(`/api/cart/mine/items/${itemUuid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, qty })
  });
  await parseOrThrow(res);
}

/**
 * --- Below this line: checkout-only, unchanged from before this pass ---
 * checkout.tsx and components/checkout/stripe-payment.tsx still import
 * these. Checkout (payment gateway selection, Indonesian delivery options)
 * is being reworked separately and wasn't touched here — kept as-is purely
 * so the route module graph still resolves. They call REST endpoints
 * (`/api/carts/:id/checkout`, `/api/stripe/paymentIntents`) that don't
 * exist on EverShop's backend, same gap noted for the old cart_id design;
 * checkout is broken until that rework lands, not because of this cart fix.
 */

export interface CheckoutAddress {
  full_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province: string;
  country: string;
  postcode: string;
  telephone: string;
}

export interface CheckoutPayload {
  cart_id: string;
  customer: { email: string };
  shippingAddress: CheckoutAddress;
  billingAddress: CheckoutAddress;
  paymentMethod: string;
  shippingMethod: string;
  shippingProvider: string;
  note?: string;
}

export interface CheckoutResult {
  uuid: string;
  order_number: string;
  payment_method: string;
}

export async function checkout(cartId: string, payload: CheckoutPayload): Promise<CheckoutResult> {
  const res = await fetch(`/api/carts/${cartId}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseOrThrow(res);
}

export interface CreatePaymentIntentResult {
  clientSecret: string;
}

export async function createStripePaymentIntent(
  cartId: string,
  orderId: string
): Promise<CreatePaymentIntentResult> {
  const res = await fetch('/api/stripe/paymentIntents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cart_id: cartId, order_id: orderId })
  });
  return parseOrThrow(res);
}
