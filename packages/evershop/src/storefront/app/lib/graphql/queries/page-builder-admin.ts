/**
 * `routes`/`route` resolve from the SAME in-process route registry
 * (`lib/router/Router.js`) the legacy Express boot populates via
 * `scanForRoutes()` — but reached over `/api/admin/graphql`, not a direct
 * import. Direct imports of `Router.js` from an RR7 route module get a
 * *different* module instance in dev (Vite's SSR module graph is separate
 * from the plain-Node realm the Express server booted in), so `getRoutes()`
 * there always comes back empty. Going through the GraphQL resolver — which
 * runs inside the original Express request handler, the same realm that
 * populated the registry — sidesteps that entirely.
 */
export const ROUTES_QUERY = /* GraphQL */ `
  query Routes {
    routes {
      id
      name
      path
      isApi
      isAdmin
      editableInPageBuilder
    }
  }
`;

export const ROUTE_QUERY = /* GraphQL */ `
  query RouteById($id: String!) {
    route(id: $id) {
      id
      name
      path
      previewPath
      isApi
      isAdmin
      editableInPageBuilder
    }
  }
`;

export interface RouteInfo {
  id: string;
  name: string;
  path: string;
  previewPath?: string | null;
  isApi: boolean;
  isAdmin: boolean;
  editableInPageBuilder: boolean;
}

export interface RoutesResponse {
  routes: RouteInfo[];
}

export interface RouteResponse {
  route: RouteInfo | null;
}

export const CHANGESET_STATE_QUERY = /* GraphQL */ `
  query ChangesetState($id: Int, $uuid: String, $route: String!) {
    changeset(id: $id, uuid: $uuid) {
      changesetId
      uuid
      token
      canUndo(route: $route)
      canRedo(route: $route)
      operationCountForRoute(route: $route)
    }
  }
`;

export interface ChangesetState {
  changesetId: number;
  uuid: string;
  token: string;
  canUndo: boolean;
  canRedo: boolean;
  operationCountForRoute: number;
}

export interface ChangesetStateResponse {
  changeset: ChangesetState | null;
}

/** Resolves a rollout plan's changeset id/token for `?session=<rollout-uuid>` edit mode. */
export const ROLLOUT_PLAN_SESSION_QUERY = /* GraphQL */ `
  query RolloutPlanSession($uuid: String!) {
    rolloutPlan(uuid: $uuid) {
      rolloutPlanId
      changesetId
      changeset {
        uuid
        token
      }
    }
  }
`;

export interface RolloutPlanSessionResponse {
  rolloutPlan: { rolloutPlanId: number; changesetId: number; changeset: { uuid: string; token: string } } | null;
}
