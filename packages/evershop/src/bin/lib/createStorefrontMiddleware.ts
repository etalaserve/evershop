import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import type {
  Application,
  NextFunction,
  Request,
  Response
} from 'express';
import isProductionMode from '../../lib/util/isProductionMode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// dist/bin/lib -> dist/bin -> dist -> package root (packages/evershop). The
// storefront's own Vite root/source lives at <package root>/src/storefront —
// it is NOT SWC-compiled into dist alongside the rest of EverShop (Vite
// handles its own TS/JSX transform), so this has to walk back up to the
// package root and into `src`, not stay under `dist`.
const packageRoot = path.resolve(__dirname, '..', '..', '..');
const STOREFRONT_ROOT = path.resolve(packageRoot, 'src', 'storefront');
const STOREFRONT_SERVER_BUILD = path.resolve(
  STOREFRONT_ROOT,
  'build',
  'server',
  'index.js'
);

/**
 * Everything an RR7 loader/action gets as `context` — an escape hatch to the
 * raw Express request/response for the handful of things that only exist
 * there: `request.session` (admin `asid` or storefront `sid`, whichever
 * addDefaultMiddlewareFuncs.ts's session-middleware selected for this path),
 * and request-bootstrap-attached helpers like `request.loginUserWithEmail`
 * (see modules/auth/bootstrap.ts — patched onto express.request's prototype
 * at boot, so it's present on every request regardless of which pipeline
 * handles it).
 */
export interface AppLoadContext {
  expressRequest: Request;
  expressResponse: Response;
}

/**
 * Mounts the React Router v7 app (storefront AND admin, cut over
 * incrementally — see MIGRATED_PATHS below) as Express middleware,
 * in-process with the rest of EverShop — no separate service/port. Dev gets
 * real SSR via Vite's middleware-mode dev server (a genuine upgrade over the
 * legacy pipeline's CSR-only dev mode); prod loads the pre-built SSR bundle
 * the same way EverShop already lazy-imports its own Webpack SSR bundles.
 *
 * Returns an Express-compatible `(req, res, next)` handler. Call once at
 * boot (not per-request) — `attachStorefrontMiddleware` awaits this before
 * mounting the returned handler on `app`.
 */
export async function createStorefrontMiddleware(): Promise<
  (request: Request, response: Response, next: NextFunction) => void
> {
  const { createRequestHandler } = await import('@react-router/express');
  const getLoadContext = (
    req: Request,
    res: Response
  ): AppLoadContext => ({ expressRequest: req, expressResponse: res });

  if (isProductionMode()) {
    const build = await import(STOREFRONT_SERVER_BUILD);
    return createRequestHandler({ build, getLoadContext });
  }

  // Dev: Vite middleware mode. `vite.middlewares` serves the client
  // dev-server assets (module graph, HMR websocket upgrade, etc) and must
  // run before the RR7 request handler, which re-loads the SSR entry fresh
  // on every request via `ssrLoadModule` so edits are picked up without a
  // restart.
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    root: STOREFRONT_ROOT,
    server: { middlewareMode: true },
    appType: 'custom'
  });

  const requestHandler = createRequestHandler({
    build: () =>
      vite.ssrLoadModule(
        'virtual:react-router/server-build'
      ) as Promise<unknown>,
    getLoadContext
  });

  return (request: Request, response: Response, next: NextFunction) => {
    vite.middlewares(request, response, (err?: unknown) => {
      if (err) {
        next(err);
        return;
      }
      requestHandler(request, response, next);
    });
  };
}

/**
 * Which requests the in-process React Router v7 app owns — both storefront
 * and admin paths, cut over incrementally, module by module (see the plan's
 * phase lists). Starts small on purpose; grows as routes are migrated. Once
 * this matches every non-API path, the legacy Webpack/Area pipeline it falls
 * through to gets deleted along with this gate.
 */
const MIGRATED_PATHS: RegExp[] = [
  /^\/admin\/login$/,
  /^\/admin\/logout$/,
  /^\/admin\/customers(\/.*)?$/,
  /^\/admin\/categories(\/.*)?$/,
  /^\/admin\/products(\/.*)?$/,
  /^\/admin\/blog\/posts(\/.*)?$/,
  /^\/admin\/cms\/pages(\/.*)?$/,
  /^\/admin\/collections(\/.*)?$/,
  /^\/admin\/attributes(\/.*)?$/,
  /^\/admin\/blog\/categories(\/.*)?$/,
  /^\/admin\/blog\/tags(\/.*)?$/,
  /^\/admin\/blog\/comments(\/.*)?$/,
  /^\/admin\/landing-pages(\/.*)?$/,
  /^\/admin\/coupons(\/.*)?$/,
  /^\/admin\/orders(\/.*)?$/,
  /^\/admin\/settings\/tax$/,
  /^\/admin\/settings\/shipping$/,
  /^\/admin\/page-builder(\/.*)?$/,
  /^\/admin\/uploads$/,
  /^\/admin$/,
  // Storefront
  /^\/$/,
  /^\/page\/.+$/,
  /^\/blog(\/.*)?$/,
  /^\/category\/.+$/,
  /^\/product\/.+$/,
  /^\/search$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
  /^\/cart$/,
  /^\/login$/,
  /^\/register$/,
  /^\/account(\/.*)?$/,
  /^\/order\/.+$/,
  /^\/admin\/settings\/store$/
];

/**
 * `<Form>`/`fetcher` submissions and client-side revalidations hit
 * `<page-path>.data`, not `<page-path>` — React Router's own convention for
 * a data-only (no HTML) response. Strip it before matching so a migrated
 * page's actions/revalidations are recognized the same as the page itself;
 * without this, every fetch-based form submission and every
 * `useRevalidator()` call 404'd through the legacy pipeline instead of
 * reaching the real route (the page-builder editor's login-form probe that
 * surfaced this: `POST /admin/login.data` 404'd even though `/admin/login`
 * itself worked fine).
 */
export function isMigratedPath(requestPath: string): boolean {
  const path = requestPath.endsWith('.data') ? requestPath.slice(0, -'.data'.length) : requestPath;
  return MIGRATED_PATHS.some((pattern) => pattern.test(path));
}

/**
 * Vite's client build (`vite.config.ts`'s `base: '/storefront-assets/'`) —
 * every SSR'd page's `<script type="module" src="/storefront-assets/...">`
 * tag, HMR client, and CSS link request this prefix, regardless of whether
 * the PAGE itself is a migrated path. `isMigratedPath` alone previously
 * gated these out (an asset request like `/storefront-assets/app/root.tsx`
 * matches none of the page patterns above), so `vite.middlewares` never ran
 * for them — every request 404'd through the legacy pipeline, and no
 * migrated page ever actually hydrated in a real browser (forms/links still
 * "worked" via native submission/navigation, masking this for anything
 * verified only by curl). Any page relying on client-side JS — `onClick`,
 * `useEffect`, drag-and-drop — was silently non-functional until this fix.
 */
const ASSET_PATH = /^\/storefront-assets\//;

/**
 * React Router's own dev-mode client fetches `/__manifest?paths=...` on
 * every navigation/revalidation to know which route modules to load —
 * same problem as `ASSET_PATH` above (not a "page", so `isMigratedPath`
 * never matched it, and it 404'd through the legacy pipeline instead of
 * reaching `vite.middlewares`). Every client-side revalidation call — the
 * page-builder editor's undo/redo/publish/discard/add-widget flow included
 * — was silently breaking on this before the fix.
 */
const RR_MANIFEST_PATH = /^\/__manifest$/;

/**
 * Wires the React Router v7 middleware onto `app`, gated by
 * `isMigratedPath` (plus the asset prefix above, unconditionally). A
 * request that doesn't match falls through (`next()`) to the existing
 * legacy pipeline untouched.
 */
export async function attachStorefrontMiddleware(app: Application) {
  // Prod: `react-router build`'s client bundle (`build/client/**`) is
  // static output, not served by anything else — dev gets the equivalent
  // for free from `vite.middlewares` inside `requestHandler` below. Mounted
  // ahead of the gate so a hit here never falls through to the legacy
  // pipeline's own 404 page.
  if (isProductionMode()) {
    app.use(
      '/storefront-assets',
      express.static(path.resolve(STOREFRONT_ROOT, 'build', 'client'))
    );
  }
  const requestHandler = await createStorefrontMiddleware();
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (
      !isMigratedPath(request.path) &&
      !ASSET_PATH.test(request.path) &&
      !RR_MANIFEST_PATH.test(request.path)
    ) {
      next();
      return;
    }
    requestHandler(request, response, next);
  });
}
