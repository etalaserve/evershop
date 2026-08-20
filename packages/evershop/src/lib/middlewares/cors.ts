import type { NextFunction, Request, Response } from 'express';

/**
 * A headless storefront on a different origin needs CORS to call `/api/*`
 * at all — EverShop ships with none by default (it's meant to serve its own
 * pages, same-origin). Mounted directly on the Express `app` in
 * `addDefaultMiddlewareFuncs.ts` (before session/routing) rather than as a
 * module's `api/global/` middleware: that convention only runs within an
 * already-matched route, so an OPTIONS preflight against a path whose
 * `route.json` never declares the OPTIONS method (every route here — none
 * list it) 404s before module-scoped global middleware ever sees it.
 *
 * `Access-Control-Allow-Origin: *` is invalid together with
 * `Allow-Credentials: true` (browsers reject it), and credentials ARE
 * needed — `customer/login`'s session cookie and the address-book endpoints
 * both rely on it (see the storefront's `lib/auth/client.ts`). So this
 * reflects the request's own Origin header instead of using a wildcard,
 * scoped to `STOREFRONT_ORIGIN` (comma-separated) when set; unset means
 * "allow any single origin" — fine for local dev, production should set it.
 */
export function cors(request: Request, response: Response, next: NextFunction) {
  const origin = request.headers.origin;
  if (origin) {
    const allowed = (process.env.STOREFRONT_ORIGIN || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    if (allowed.length === 0 || allowed.includes(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Vary', 'Origin');
    }
  }
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.status(204);
    response.end();
    return;
  }
  next();
}
