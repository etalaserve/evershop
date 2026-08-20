/** Forward the visitor's Cookie header to EverShop so `currentCustomer`/order queries resolve their session. Mirrors the same pattern used for cart's myCart forwarding (routes/cart.tsx history) — this one is a real session, not a workaround. */
export function forwardCookieHeaders(request: Request): Record<string, string> | undefined {
  const cookie = request.headers.get('cookie');
  return cookie ? { cookie } : undefined;
}
