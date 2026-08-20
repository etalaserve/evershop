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

const adminGraphqlClient = new GraphQLClient(endpoint);

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
