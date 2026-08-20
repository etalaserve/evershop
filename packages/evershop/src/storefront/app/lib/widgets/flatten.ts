import type { WidgetFragment } from '~/lib/graphql/queries/widgets.js';

/** Flattens the route's widget tree (top-level + nested container columns) into one list. */
export function flattenWidgets(widgets: WidgetFragment[]): WidgetFragment[] {
  const out: WidgetFragment[] = [];
  for (const w of widgets) {
    out.push(w);
    for (const col of w.columns) out.push(...flattenWidgets(col.widgets));
  }
  return out;
}
