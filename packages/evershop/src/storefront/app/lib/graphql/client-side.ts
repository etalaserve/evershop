/**
 * Browser-only GraphQL fetcher. `lib/graphql/client.ts`'s `gql()` targets an
 * absolute loopback URL (needed for the server-side fetch); the browser can
 * just hit the relative same-origin path directly. Used for checkout's live
 * shipping-method lookup, which has to run client-side (it fires on user
 * input, not page load).
 */
export async function gqlClient<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(body.errors[0]?.message ?? 'GraphQL request failed');
  }
  return body.data as T;
}
