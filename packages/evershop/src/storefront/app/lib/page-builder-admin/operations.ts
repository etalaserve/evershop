import type { AddOperationInput } from './api.js';

/**
 * Builds the `changeset_operation` payloads the existing
 * `POST /api/page-builder/changesets/:id/operations` endpoint expects —
 * see `applyOperationToSource.ts` for the exact contract this mirrors:
 * URN format `urn:evershop:cms:<widget_instance|widget_placement>:<uuid>`,
 * snake_case payload keys (they're applied via a raw `update(...).given()`
 * against the real columns), and `status` as a JS boolean (the column is
 * `boolean`, not the `Int` the GraphQL `Widget.status` field exposes).
 *
 * `change_order` is required by the endpoint's validation but is a
 * server-computed value in practice (`void changeOrder` in the handler) —
 * any non-negative integer satisfies it.
 */

const CHANGE_ORDER_PLACEHOLDER = 0;

function widgetInstanceUrn(uuid: string): string {
  return `urn:evershop:cms:widget_instance:${uuid}`;
}
function widgetPlacementUrn(uuid: string): string {
  return `urn:evershop:cms:widget_placement:${uuid}`;
}

export interface NewWidgetIds {
  instanceUuid: string;
  placementUuid: string;
}

/** Add a widget: one INSERT on widget_instance, one INSERT on widget_placement. */
export function buildAddWidgetOps(params: {
  route: string;
  area: string;
  sortOrder: number;
  type: string;
  name: string;
  defaultSettings: Record<string, unknown>;
  isGlobal?: boolean;
}): { ops: AddOperationInput[]; ids: NewWidgetIds } {
  const instanceUuid = crypto.randomUUID();
  const placementUuid = crypto.randomUUID();
  const ops: AddOperationInput[] = [
    {
      route: params.route,
      entityUrn: widgetInstanceUrn(instanceUuid),
      oldPayload: null,
      newPayload: {
        name: params.name,
        type: params.type,
        settings: params.defaultSettings,
        status: true
      }
    },
    {
      route: params.route,
      entityUrn: widgetPlacementUrn(placementUuid),
      oldPayload: null,
      newPayload: {
        widget_instance_uuid: instanceUuid,
        route: params.isGlobal ? 'all' : params.route,
        area: params.area,
        sort_order: params.sortOrder,
        entity_urn: null
      }
    }
  ];
  return { ops, ids: { instanceUuid, placementUuid } };
}

/** Edit a widget's settings: one UPDATE on widget_instance. */
export function buildUpdateSettingsOp(params: {
  route: string;
  instanceUuid: string;
  oldSettings: Record<string, unknown>;
  newSettings: Record<string, unknown>;
}): AddOperationInput {
  return {
    route: params.route,
    entityUrn: widgetInstanceUrn(params.instanceUuid),
    oldPayload: { settings: params.oldSettings },
    newPayload: { settings: params.newSettings }
  };
}

/** Move a widget within an area: one UPDATE on widget_placement's sort_order. */
export function buildMoveOp(params: {
  route: string;
  placementUuid: string;
  oldSortOrder: number;
  newSortOrder: number;
}): AddOperationInput {
  return {
    route: params.route,
    entityUrn: widgetPlacementUrn(params.placementUuid),
    oldPayload: { sort_order: params.oldSortOrder },
    newPayload: { sort_order: params.newSortOrder }
  };
}

/**
 * Delete a widget: DELETE its placement, then DELETE the instance itself
 * (Phase A treats one widget as one placement — a widget shared across
 * multiple pages/areas isn't supported by the palette/canvas yet).
 */
export function buildDeleteOps(params: {
  route: string;
  instanceUuid: string;
  placementUuid: string;
}): AddOperationInput[] {
  return [
    {
      route: params.route,
      entityUrn: widgetPlacementUrn(params.placementUuid),
      oldPayload: { uuid: params.placementUuid },
      newPayload: null
    },
    {
      route: params.route,
      entityUrn: widgetInstanceUrn(params.instanceUuid),
      oldPayload: { uuid: params.instanceUuid },
      newPayload: null
    }
  ];
}

export { CHANGE_ORDER_PLACEHOLDER };
