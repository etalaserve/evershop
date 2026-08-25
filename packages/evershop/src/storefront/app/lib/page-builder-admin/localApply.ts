import type { WidgetFragment } from '~/lib/graphql/queries/widgets.js';

/**
 * Pure, local mirrors of the `changeset_operation` semantics in
 * `operations.ts`, applied against the in-memory `WidgetFragment` tree so the
 * editor can show the result of an edit immediately instead of waiting for a
 * server round trip.
 *
 * These are deliberately optimistic *approximations*, not a second source of
 * truth: after every mutation the editor refetches the authoritative snapshot
 * (`/admin/page-builder/preview`) and replaces the tree wholesale. If one of
 * these disagrees with the server, the divergence lasts ~200ms and self-heals
 * rather than persisting — which is what lets them stay this simple.
 *
 * Every function must recurse into `widget.columns[].widgets`: container
 * widgets (Columns/Section) hold their children inline in the same tree, and
 * `WidgetArea.findWidgetsInArea` searches nested, so a child placed in a
 * synthetic `columnsContainer_<uuid>_col_<n>` area only renders if it
 * physically lives inside that parent's column.
 */

const COLUMNS_AREA_PREFIX = 'columnsContainer_';

/** Parses `columnsContainer_<parentUuid>_col_<index>` → its parts, or null for a normal area. */
export function parseColumnArea(
  area: string
): { parentUuid: string; columnIndex: number } | null {
  if (!area.startsWith(COLUMNS_AREA_PREFIX)) return null;
  const rest = area.slice(COLUMNS_AREA_PREFIX.length);
  const marker = rest.lastIndexOf('_col_');
  if (marker === -1) return null;
  const parentUuid = rest.slice(0, marker);
  const columnIndex = Number.parseInt(rest.slice(marker + '_col_'.length), 10);
  if (!parentUuid || !Number.isFinite(columnIndex)) return null;
  return { parentUuid, columnIndex };
}

/** Rebuilds `list`, replacing the widget with `uuid` via `fn`. Returns the list unchanged if not found. */
function mapWidget(
  list: WidgetFragment[],
  uuid: string,
  fn: (widget: WidgetFragment) => WidgetFragment
): WidgetFragment[] {
  return list.map((widget) => {
    if (widget.uuid === uuid) return fn(widget);
    if (widget.columns.length === 0) return widget;
    return {
      ...widget,
      columns: widget.columns.map((column) => ({
        ...column,
        widgets: mapWidget(column.widgets, uuid, fn)
      }))
    };
  });
}

export interface AddParams {
  instanceUuid: string;
  placementUuid: string;
  type: string;
  area: string;
  sortOrder: number;
  settings: Record<string, unknown>;
}

/**
 * Insert a new widget. A `columnsContainer_*` area nests it inside that
 * parent's column (creating the column entry if the container has no
 * children yet); anything else appends at the top level.
 */
export function applyAdd(tree: WidgetFragment[], params: AddParams): WidgetFragment[] {
  const widget: WidgetFragment = {
    uuid: params.instanceUuid,
    type: params.type,
    status: 1,
    rawSettings: params.settings,
    placements: [
      {
        uuid: params.placementUuid,
        area: params.area,
        sortOrder: params.sortOrder,
        entityUrn: null
      }
    ],
    columns: []
  };

  const column = parseColumnArea(params.area);
  if (!column) return [...tree, widget];

  return mapWidget(tree, column.parentUuid, (parent) => {
    const existing = parent.columns.find((c) => c.index === column.columnIndex);
    const columns = existing
      ? parent.columns.map((c) =>
          c.index === column.columnIndex ? { ...c, widgets: [...c.widgets, widget] } : c
        )
      : [...parent.columns, { index: column.columnIndex, widgets: [widget] }].sort(
          (a, b) => a.index - b.index
        );
    return { ...parent, columns };
  });
}

/** Reorder within an area: rewrite the matching placement's `sortOrder`. `WidgetArea` re-sorts on render, so this is the whole move. */
export function applyMove(
  tree: WidgetFragment[],
  widgetUuid: string,
  area: string,
  newSortOrder: number
): WidgetFragment[] {
  return mapWidget(tree, widgetUuid, (widget) => ({
    ...widget,
    placements: widget.placements.map((p) =>
      p.area === area ? { ...p, sortOrder: newSortOrder } : p
    )
  }));
}

/** Remove a widget wherever it sits — top level or nested in a container's column. */
export function applyDelete(tree: WidgetFragment[], widgetUuid: string): WidgetFragment[] {
  return tree
    .filter((widget) => widget.uuid !== widgetUuid)
    .map((widget) =>
      widget.columns.length === 0
        ? widget
        : {
            ...widget,
            columns: widget.columns.map((column) => ({
              ...column,
              widgets: applyDelete(column.widgets, widgetUuid)
            }))
          }
    );
}

/** Replace a widget's settings (the Settings drawer's save). */
export function applyUpdateSettings(
  tree: WidgetFragment[],
  widgetUuid: string,
  settings: Record<string, unknown>
): WidgetFragment[] {
  return mapWidget(tree, widgetUuid, (widget) => ({ ...widget, rawSettings: settings }));
}

/** Duplicate: same shape as an add, but seeded from an existing widget's settings. */
export function applyDuplicate(
  tree: WidgetFragment[],
  params: AddParams
): WidgetFragment[] {
  return applyAdd(tree, params);
}
