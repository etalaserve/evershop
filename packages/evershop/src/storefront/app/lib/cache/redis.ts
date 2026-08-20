import Redis from 'ioredis';

/**
 * Single shared connection, lazily created. `REDIS_URL` unset means caching
 * is off for this deployment (e.g. local dev without a Redis container) —
 * every helper in `middleware.ts` treats a null client as "skip the cache".
 */
let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) {
    return client;
  }
  const url = process.env.REDIS_URL;
  if (!url) {
    client = null;
    return client;
  }
  client = new Redis(url, {
    maxRetriesPerRequest: 1,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 2000)
  });
  client.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[redis] connection error:', err.message);
  });
  return client;
}
