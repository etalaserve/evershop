import { GraphQLClient } from 'graphql-request';

/**
 * Server-side loader/action code runs in the same process as EverShop's own
 * Express app, but `fetch()` in Node still needs an absolute URL — this is a
 * loopback call to the same server, not a call to some other deployment.
 * `PORT` is the same env var `bin/lib/normalizePort.js` reads to bind the
 * HTTP server, so this always targets the process's own listening port.
 *
 * The path MUST be `/api/graphql`, not the bare `/graphql` a route.json file
 * seems to declare — `scanForRoutes.js` prepends `/api` to every route
 * registered under a module's `api/` folder (`isApi: true`), which this one
 * is (`modules/graphql/api/graphql/route.json`). The bare `/graphql` path
 * only means anything internally, as the registered route id and build
 * output key for EverShop's own SSR per-route query pipeline — hitting it
 * directly
 * as an external GraphQL client 404s (verified: it 500s trying to read a
 * nonexistent `query-graphql.graphql` compiled-query file). `/api/graphql`
 * is the real, working, general-purpose GraphQL-over-HTTP endpoint (verified
 * both against `HydrateFrontStore.tsx`'s client-side urql config and by
 * direct curl: `/api/graphql` returns `{"data":{"__typename":"Query"}}`,
 * `/graphql` returns the storefront's own 404 page).
 */
const endpoint = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/graphql`;

export const graphqlClient = new GraphQLClient(endpoint, {
  // Identifies this as the app calling itself to render a page, so the
  // site-wide rate limiter does not count it against the shared loopback
  // bucket. Only honoured on a loopback connection — see rateLimit.ts.
  // Literal rather than an import: the constant lives in
  // modules/base/services/rateLimit.ts, which pulls in express-rate-limit —
  // dragging that into this Vite-bundled tree to share one string is a worse
  // trade than repeating it. Keep the two in sync.
  headers: { 'x-evershop-internal': '1' }
});

/**
 * Thin wrapper so callers don't import graphql-request directly.
 *
 * `headers` matters for exactly one case: `myCart` (`Cart.resolvers.ts`)
 * resolves from EverShop's own signed session cookie on the incoming
 * request — there is no cart-by-id query for the storefront's anonymous
 * session. Cart-related loaders must forward the visitor's `Cookie` header
 * here or `myCart` always resolves null.
 */
export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
  headers?: Record<string, string>
): Promise<T> {
  return graphqlClient.request<T>({ document: query, variables, requestHeaders: headers });
}
