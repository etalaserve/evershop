/**
 * EverShop's GraphQL responses return paths relative to EverShop itself
 * (e.g. `/assets/catalog/...`). Now that the storefront is mounted
 * in-process on the same origin as EverShop, those paths already work as-is
 * — no base URL to prepend. Kept as a named passthrough (rather than using
 * `product.image.url` directly) so call sites stay obviously intentional and
 * this is the one place to touch if that ever changes again.
 */
export function toEvershopUrl(path: string): string {
  return path;
}

/** Alias for call sites rendering `<img src>` — same function, clearer at the call site. */
export const imageUrl = toEvershopUrl;
