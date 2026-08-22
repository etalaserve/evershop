import { addMiddleware } from './addMiddleware.js';
import { buildMiddlewareFunctionFromHandler } from './buildMiddlewareFunctionFromHandler.js';

/**
 * Explicit, readable alternative to the bracket-filename convention
 * (`[after]id[before].js`, parsed by `parseFromFile.js`) for declaring a
 * middleware's place in the request pipeline. Reuses the exact same
 * `Handler`/`sortMiddlewares` dependency-ordering engine underneath — this
 * only changes how an entry gets registered, not how the pipeline is
 * built or executed.
 *
 * `route` mirrors what `getRouteFromPath.js` already derives from a
 * bracket-file's folder position, made explicit instead of inferred:
 *   - A specific route's own middleware: `{ region, scope: routeId, routeId }`
 *     (API routes) or `{ region, scope: 'admin'|'frontStore', routeId }`
 *     (page routes) — same as today.
 *   - Global/app-scoped middleware (the `pages/global`/`api/global`
 *     cross-cutting chains): `{ region, scope: 'app', routeId: null }`.
 *
 * See any migrated route folder's `middlewares.js` for the intended calling
 * shape — one `defineMiddlewares(route, [...])` call per folder.
 */
export function registerMiddleware(route, config) {
  addMiddleware({
    id: config.id,
    middleware: buildMiddlewareFunctionFromHandler(
      config.id,
      config.handler,
      route.routeId
    ),
    before: config.before,
    after: config.after,
    region: route.region,
    scope: route.scope,
    routeId: route.routeId,
    // Not a real file path — findDublicatedMiddleware's error message reads
    // `.path` to identify a collision; this is just a diagnostic label.
    path: `registerMiddleware:${route.region}:${route.scope}:${route.routeId ?? 'null'}:${config.id}`
  });
}

/** Sugar for registering every middleware in one route folder in one call — see registerMiddleware for the shapes. */
export function defineMiddlewares(route, entries) {
  entries.forEach((entry) => registerMiddleware(route, entry));
}
