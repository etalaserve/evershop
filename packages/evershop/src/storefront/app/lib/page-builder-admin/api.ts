/**
 * Client-side wrapper around the existing (unmodified) REST endpoints under
 * `/api/page-builder/*` — see `packages/evershop/src/modules/pageBuilder/api/`.
 * Same-origin `fetch`, `asid` cookie sent automatically; no new backend code.
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/page-builder${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
  return body?.data as T;
}

export interface AddOperationInput {
  route: string;
  entityUrn: string;
  oldPayload: Record<string, unknown> | null;
  newPayload: Record<string, unknown> | null;
}

/**
 * `change_order` is validated (must be a non-negative integer) but then
 * discarded server-side (`void changeOrder` in the handler) — the real
 * order is computed there via `MAX(change_order) + 1`. Any valid integer
 * satisfies the check.
 */
export const pageBuilderApi = {
  addOperation: (changesetId: number, input: AddOperationInput) =>
    request(`/changesets/${changesetId}/operations`, {
      method: 'POST',
      body: JSON.stringify({
        route: input.route,
        entity_urn: input.entityUrn,
        old_payload: input.oldPayload,
        new_payload: input.newPayload,
        change_order: 0
      })
    }),

  moveCurrent: (changesetId: number, route: string, direction: 'undo' | 'redo') =>
    request<{ canUndo: boolean; canRedo: boolean }>(`/changesets/${changesetId}/move-current`, {
      method: 'POST',
      body: JSON.stringify({ route, direction })
    }),

  discard: (changesetId: number, route?: string) =>
    request(`/changesets/${changesetId}/discard${route ? `?route=${encodeURIComponent(route)}` : ''}`, {
      method: 'POST'
    }),

  publish: (changesetId: number) => request(`/changesets/${changesetId}/publish`, { method: 'POST' }),

  createRolloutPlan: (input: { name: string; changesetId: number; startTime: string; endTime: string | null }) =>
    request<RolloutPlan>('/rollout-plans', {
      method: 'POST',
      body: JSON.stringify({ name: input.name, changeset_id: input.changesetId, start_time: input.startTime, end_time: input.endTime })
    }),

  updateRolloutPlan: (id: number, input: { name: string; startTime: string; endTime: string | null }) =>
    request<RolloutPlan>(`/rollout-plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: input.name, start_time: input.startTime, end_time: input.endTime })
    }),

  cancelRolloutPlan: (id: number) => request(`/rollout-plans/${id}`, { method: 'DELETE' }),

  listRolloutPlans: (status: 'active' | 'upcoming' | 'past' | 'all' = 'all') =>
    request<{ status: string; rolloutPlans: RolloutPlan[] }>(`/rollout-plans?status=${status}`)
};

export interface RolloutPlan {
  rolloutPlanId: number;
  uuid: string;
  name: string;
  changesetId: number;
  startTime: string;
  endTime: string | null;
  indefinite: boolean;
  changeset: { name: string; uuid: string; publishedAt: string | null; operationCount: number };
}
