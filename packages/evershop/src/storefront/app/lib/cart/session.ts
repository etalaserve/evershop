/**
 * Legacy cart_id cookie helpers — cart.tsx and product page add-to-cart no
 * longer use these (see lib/cart/client.ts: cart is now identified by
 * EverShop's own `sid` session cookie, same-origin, no separate id this
 * storefront invents). Only `clearCartIdClient` survives, still referenced
 * by checkout.tsx's Stripe flow — checkout itself is being reworked
 * separately (payment gateway selection, Indonesian delivery options) and
 * wasn't touched in this pass. Delete this file once that rework lands.
 */
const CART_COOKIE_NAME = 'cart_id';

export function clearCartIdClient(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${CART_COOKIE_NAME}=; Path=/; Max-Age=0`;
}

/** Still used by checkout.tsx's own loader (pending rework) — the cookie is never set anymore by the cart/add-to-cart flow, so this now always returns null in practice. */
export function getCartIdFromRequest(request: Request): string | null {
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${CART_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
