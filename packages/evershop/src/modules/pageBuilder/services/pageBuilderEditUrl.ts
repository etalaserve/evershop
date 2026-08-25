/**
 * URL of the page-builder editor for a given route id.
 *
 * The editor is a React Router v7 route
 * (`storefront/app/routes/admin_.page-builder.edit.$routeId.tsx`), reached via
 * the `/^\/admin\/page-builder(\/.*)?$/` entry in `MIGRATED_PATHS`
 * (`bin/lib/createStorefrontMiddleware.ts`). RRv7 routes are not in the legacy
 * `Router` registry, so `buildUrl('pageBuilderEdit', …)` cannot resolve it —
 * that helper throws on an unknown route id (`lib/router/buildUrl.ts:33`).
 *
 * The literal below is exactly what `buildUrl` used to return for the old
 * `pageBuilderEdit` route: `registerAdminRoute.js:27` prefixed the
 * `route.json` path with `/admin`, and `applyLocalePrefix` is a no-op for
 * admin routes (`lib/locale/activeDictionary.ts:82` returns the url unchanged
 * when `targetIsAdmin`). So this is byte-identical to the previous behaviour,
 * not an approximation.
 *
 * Exists as a named helper rather than an inline template string so the one
 * place that knows this path is greppable when the editor moves again — which
 * it will, when Puck lands.
 */
export function pageBuilderEditUrl(routeId: string): string {
  return `/admin/page-builder/edit/${encodeURIComponent(routeId)}`;
}
