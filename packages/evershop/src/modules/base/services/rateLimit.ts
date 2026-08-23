import type { NextFunction, Request, Response } from 'express';
import {
  rateLimit,
  type Options,
  type RateLimitRequestHandler
} from 'express-rate-limit';
import { TOO_MANY_REQUESTS } from '../../../lib/util/httpStatus.js';

/**
 * Per-client-IP rate limits. Hardcoded on purpose (not operator-configurable):
 * they are a capacity safety net, tuned to shed single-source floods while
 * staying generous for real users — including many sharing one NAT/corporate
 * IP. Values are per IP, per window. Note a per-IP limit only stops
 * single-source floods; a distributed flood needs an edge WAF.
 */
const RULES = {
  // Storefront + admin pages: ~5 req/s/IP.
  page: { windowMs: 60_000, limit: 300 },
  // /api/**: scripted clients, tighter than human browsing.
  api: { windowMs: 60_000, limit: 120 },
  // Login / registration / password reset: brute-force / credential-stuffing guard.
  auth: { windowMs: 15 * 60_000, limit: 8 }
} as const;

type Tier = keyof typeof RULES;

/**
 * Requests that must never count against a limit: static assets (served and
 * terminated by publicStatic/themePublicStatic or the dev bundles), HMR, and
 * health probes. Static/asset requests carry a file extension; dynamic pages
 * and REST paths do not — so an extension test cleanly separates the two.
 */
const STATIC_ASSET =
  /\.(?:js|mjs|cjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot|txt|xml|json)$/i;

function isExempt(path: string): boolean {
  return (
    STATIC_ASSET.test(path) ||
    path.startsWith('/__webpack_hmr') ||
    path.includes('.hot-update') ||
    path.startsWith('/backend/') || // admin dev bundle
    path === '/health' ||
    path === '/healthz'
  );
}

/**
 * Set by the storefront's own GraphQL clients on their loopback self-calls.
 * Meaningless on its own — see rateLimiter() for why it is only honoured
 * together with a loopback source address.
 */
export const INTERNAL_REQUEST_HEADER = 'x-evershop-internal';

/**
 * Is this request from the machine itself?
 *
 * Covers IPv4 loopback, IPv6 `::1`, and the IPv4-mapped `::ffff:127.0.0.1`
 * form Node reports when a v4 client connects to a dual-stack socket — which
 * is what the storefront's own SSR self-calls actually look like.
 */
export function isLoopback(ip: string | undefined): boolean {
  if (!ip) return false;
  const bare = ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
  return bare === '::1' || bare === '127.0.0.1' || bare.startsWith('127.');
}

/** Sensitive credential endpoints (POST) that get the strict `auth` tier. */
const AUTH_POST_PATHS = new Set<string>([
  '/customer/login', // storefront login (customerLoginJson)
  '/admin/user/login', // admin login (adminLoginJson)
  '/api/customers', // customer registration (createCustomer)
  '/api/customers/reset-password', // resetPassword
  '/api/customers/password' // updatePassword
]);

function isApiPath(path: string): boolean {
  return path === '/api' || path.startsWith('/api/');
}

/**
 * A storefront path can carry a leading locale prefix (e.g. `/fr`, `/en-US`)
 * that the locale middleware strips later — but this limiter runs before that,
 * so strip an optional prefix before matching the sensitive endpoints. Only a
 * 2-letter segment (optionally `-CC`) directly followed by `/` is treated as a
 * locale, so real first segments like `/api` or `/account` are left intact.
 */
const LOCALE_PREFIX = /^\/[a-z]{2}(?:-[a-zA-Z]{2})?(?=\/)/;

function withoutLocale(path: string): string {
  return path.replace(LOCALE_PREFIX, '');
}

/**
 * Decide which limit tier a request falls under. This runs before route
 * matching, so it classifies on method + path only. Pure — unit-tested in
 * isolation.
 */
export function classifyRequest(
  method: string,
  path: string
): Tier | 'exempt' {
  if (isExempt(path)) {
    return 'exempt';
  }
  if (
    method === 'POST' &&
    (AUTH_POST_PATHS.has(path) || AUTH_POST_PATHS.has(withoutLocale(path)))
  ) {
    return 'auth';
  }
  if (isApiPath(path)) {
    return 'api';
  }
  return 'page';
}

/**
 * Shared 429 responder: a JSON envelope for API routes (matching EverShop's
 * error shape), plain text for pages. Sets Retry-After from the tier window.
 */
function tooManyRequests(
  request: Request,
  response: Response,
  _next: NextFunction,
  options: Options
): void {
  response.setHeader('Retry-After', String(Math.ceil(options.windowMs / 1000)));
  if (isApiPath(request.path)) {
    response.status(TOO_MANY_REQUESTS).json({
      error: {
        status: TOO_MANY_REQUESTS,
        message: 'Too many requests. Please slow down and try again later.'
      }
    });
  } else {
    response
      .status(TOO_MANY_REQUESTS)
      .send('Too many requests. Please slow down and try again shortly.');
  }
}

function build(rule: {
  windowMs: number;
  limit: number;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: rule.windowMs,
    limit: rule.limit,
    standardHeaders: true, // RateLimit-* headers so clients can back off
    legacyHeaders: false,
    handler: tooManyRequests
    // Express `trust proxy` is set to a numeric hop count from TRUST_PROXY_HOPS
    // (see lib/util/getTrustProxyHops.ts), so `request.ip` is the real client IP
    // and express-rate-limit's own trust-proxy validation stays on as an operator
    // guardrail — a numeric value never trips its permissive-trust-proxy check.
  });
}

// Built once at module load (i.e. app initialization) — express-rate-limit
// warns if an instance is created inside a request handler. MemoryStore unrefs
// its cleanup timer, so this does not keep the process alive.
const limiters: Record<Tier, RateLimitRequestHandler> = {
  page: build(RULES.page),
  api: build(RULES.api),
  auth: build(RULES.auth)
};

/**
 * Site-wide rate limiter. Mounted early (before session/locale/DB work) so
 * abusive floods are shed with a 429 before they consume a database connection.
 * Dispatches each request to the matching tier's limiter.
 */
export function rateLimiter(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  // The storefront renders server-side by calling this same process over
  // loopback (`http://127.0.0.1:$PORT/api/graphql` — see
  // storefront/app/lib/graphql/client.ts), so every page render spends one
  // request from 127.0.0.1's bucket. Counting those turns the limiter on the
  // app itself: the `api` tier allows 120/min, which caps the WHOLE store at
  // ~120 renders per minute no matter how many customers there are, and past
  // that the loader receives a 429 from its own API, throws, and the customer
  // gets a 500 instead of a page. Measured: a 400-request burst returned 165
  // 429s and 178 500s.
  //
  // Both conditions are required, and neither is sufficient. Exempting all
  // loopback traffic would silently disable the limiter entirely whenever a
  // reverse proxy runs on the same host and TRUST_PROXY_HOPS is wrong, since
  // every customer would then appear to connect from 127.0.0.1. Exempting on
  // the header alone would let anyone opt out by sending it. Together they
  // describe only this process talking to itself.
  if (isLoopback(request.ip) && request.get(INTERNAL_REQUEST_HEADER)) {
    next();
    return;
  }

  const tier = classifyRequest(request.method, request.path);
  if (tier === 'exempt') {
    next();
    return;
  }
  limiters[tier](request, response, next);
}
