/** Browser-only admin GraphQL fetcher — same-origin, cookie sent automatically. */
export async function gqlAdminClient<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/admin/graphql', {
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
