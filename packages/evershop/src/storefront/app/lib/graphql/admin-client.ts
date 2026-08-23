import { GraphQLClient } from 'graphql-request';

/**
 * Admin-schema counterpart to `lib/graphql/client.ts` — same loopback
 * reasoning (`/api/admin/graphql`, not a bare `/admin/graphql` path), but
 * targets `adminSchema` instead of the storefront schema (page-builder
 * changesets/rollout plans/routes are admin-only types). Server-side only
 * — always forward the request's `Cookie` header (the `asid` session) or
 * every call resolves as unauthenticated.
 */
const endpoint = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/admin/graphql`;

const adminGraphqlClient = new GraphQLClient(endpoint, {
  // Identifies this as the app calling itself to render a page, so the
  // site-wide rate limiter does not count it against the shared loopback
  // bucket. Only honoured on a loopback connection — see rateLimit.ts.
  // Literal rather than an import: the constant lives in
  // modules/base/services/rateLimit.ts, which pulls in express-rate-limit —
  // dragging that into this Vite-bundled tree to share one string is a worse
  // trade than repeating it. Keep the two in sync.
  headers: { 'x-evershop-internal': '1' }
});

export async function gqlAdmin<T>(
  query: string,
  variables: Record<string, unknown> | undefined,
  cookie: string | null
): Promise<T> {
  return adminGraphqlClient.request<T>({
    document: query,
    variables,
    requestHeaders: cookie ? { Cookie: cookie } : undefined
  });
}
