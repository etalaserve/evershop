import Redis from 'ioredis';

/**
 * A standalone Redis client for the legacy pipeline to invalidate cache keys
 * written by the new storefront app's `cached()` helper
 * (`src/storefront/app/lib/cache/middleware.ts`). That module lives under
 * Vite's own build root (`src/storefront/app/**`), which isn't part of the
 * SWC-compiled `dist/` tree the legacy pipeline runs from, so it can't be
 * imported directly here — this is a second, independent connection to the
 * same Redis instance (`REDIS_URL`), not a shared client.
 */
let client;

function getClient() {
  if (client !== undefined) {
    return client;
  }
  const url = process.env.REDIS_URL;
  if (!url) {
    client = null;
    return client;
  }
  client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: false });
  client.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[redis] connection error:', err.message);
  });
  return client;
}

/**
 * Drop a single cache key the storefront's `cached()` helper wrote (e.g.
 * `fragment:settings`, invalidated after a theme/store-settings save so the
 * change is visible immediately instead of waiting out the TTL).
 */
export async function invalidateStorefrontCacheKey(key) {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // Non-fatal — the setting still saved correctly; the storefront just
    // serves the stale cached value until its TTL expires.
  }
}
