import type { WidgetFragment } from '../graphql/queries/widgets.js';

/** Flattens the route's widget tree (top-level + nested container columns) into one list. */
export function flattenWidgets(widgets: WidgetFragment[]): WidgetFragment[] {
  const out: WidgetFragment[] = [];
  for (const w of widgets) {
    out.push(w);
    for (const col of w.columns) out.push(...flattenWidgets(col.widgets));
  }
  return out;
}

/**
 * Resolves a `(widgetUid, area)` pair from an iframe message (which only
 * carries the widget_instance uuid) to its placement — needed because
 * move/delete/duplicate ops target `cms:widget_placement:<uuid>`, and the
 * placement uuid isn't part of the message payload.
 */
export function findPlacement(widgets: WidgetFragment[], widgetUid: string, area: string) {
  const widget = flattenWidgets(widgets).find((w) => w.uuid === widgetUid);
  if (!widget) return null;
  const placement = widget.placements.find((p) => p.area === area);
  if (!placement) return null;
  return { widget, placement };
}
