import { getRedis } from './redis.js';

export const CACHE_TTL = {
  /** Full-page/data cache for anonymous storefront views — category/product listings. */
  page: 60,
  /** Individual GraphQL responses (product detail, category tree, search). */
  data: 300,
  /** Rarely-changing shared chrome — header nav, footer, theme tokens. */
  fragment: 600
} as const;

/**
 * Cache-aside: return the cached value for `key` if present, otherwise call
 * `load()`, cache its result for `ttlSeconds`, and return it. With no Redis
 * configured (`getRedis()` returns null) this degrades to calling `load()`
 * on every request — correct, just uncached.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>
): Promise<T> {
  const redis = getRedis();
  if (!redis) {
    return load();
  }
  try {
    const hit = await redis.get(key);
    if (hit !== null) {
      return JSON.parse(hit) as T;
    }
  } catch {
    // Redis read failed (e.g. connection blip) — fall through to a live load
    // rather than 500ing the page over a cache-layer problem.
  }
  const value = await load();
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Cache write failures are non-fatal; the page still renders correctly,
    // just uncached for this request.
  }
  return value;
}

/**
 * Drop every key under a prefix (e.g. `product:` after an EverShop
 * `product_updated` event). Not wired to a live webhook yet — EverShop has no
 * outbound webhook system today, only internal event subscribers — so for
 * now this is invoked manually / from an admin action. TTL expiry
 * (`CACHE_TTL`) is what actually keeps data fresh in the meantime.
 */
export async function invalidateByPrefix(prefix: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const keys = await redis.keys(`${prefix}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
