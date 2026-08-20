import React from 'react';

import { AreaDropZone } from '~/lib/page-builder/AreaDropZone.js';
import { useIsInPageBuilderIframe } from '~/lib/page-builder/pageBuilderMode.js';
import { usePreviewWidgets } from '~/lib/page-builder/PreviewContext.js';
import { WidgetChrome } from '~/lib/page-builder/WidgetChrome.js';
import type { WidgetFragment } from '~/lib/graphql/queries/widgets.js';
import { getStorefrontWidget } from '~/lib/widgets/registry.js';

function sortOrderFor(widget: WidgetFragment, areaId: string): number {
  const placement = widget.placements.find((p) => p.area === areaId);
  return placement ? placement.sortOrder : 0;
}

/**
 * Finds every widget placed in `areaId`, searching both the top level and
 * nested `columns` (container children carry their own placements, scoped
 * to their parent's synthetic `columnsContainer_<uid>_col_<n>` area — see
 * `Widget.graphql`). Needed because the page-builder's live-preview override
 * (`PreviewContext`) always holds the *full* route-level tree, not a
 * per-area slice, so a nested `WidgetArea` (rendered by `Columns`/`Section`)
 * must search into it the same way it searches the loader-fetched tree.
 */
function findWidgetsInArea(list: WidgetFragment[], areaId: string): WidgetFragment[] {
  const found: WidgetFragment[] = [];
  for (const widget of list) {
    if (widget.placements.some((p) => p.area === areaId)) {
      found.push(widget);
    }
    for (const column of widget.columns) {
      found.push(...findWidgetsInArea(column.widgets, areaId));
    }
  }
  return found;
}

/**
 * Renders every widget instance placed in `areaId`, in placement order,
 * looking each one's `type` up in the storefront widget registry. Silently
 * skips unregistered types (no crash — matches the legacy Area behavior of
 * rendering nothing for a component it can't resolve).
 *
 * Container widgets (`columns`, `section`) carry their nested children on
 * `widget.columns` already, from the single `widgetsForRoute` query — their
 * own registered components recurse into `WidgetArea` for each column
 * (see `Columns.tsx` / `Section.tsx`), passing the synthetic
 * `columnsContainer_<uid>_col_<index>` area id the legacy pipeline used, so
 * the page-builder's drop-zone / drag-and-drop wiring keeps working
 * unmodified.
 */
export function WidgetArea({
  areaId,
  widgets,
  extras,
  isGlobal = false,
  editableInPageBuilder = true
}: {
  areaId: string;
  widgets: WidgetFragment[];
  /** Server-resolved data for recommendation/collection widgets, keyed by widget uuid — see `WidgetComponentProps.extra`. */
  extras?: Record<string, unknown>;
  isGlobal?: boolean;
  editableInPageBuilder?: boolean;
}): React.ReactElement {
  const inPageBuilder = useIsInPageBuilderIframe();
  const { widgets: previewWidgets } = usePreviewWidgets();
  // Inside the page-builder iframe, prefer the live-edited widget list once
  // the bridge has received at least one `data-update` — falls back to the
  // loader-fetched list for the iframe's own first paint.
  const source = inPageBuilder && previewWidgets ? previewWidgets : widgets;

  const items = findWidgetsInArea(source, areaId).sort(
    (a, b) => sortOrderFor(a, areaId) - sortOrderFor(b, areaId)
  );

  const wrapperProps: Record<string, unknown> = {
    'data-evershop-area-id': areaId
  };
  if (isGlobal) wrapperProps['data-evershop-global'] = 'true';

  return (
    <div {...wrapperProps}>
      {editableInPageBuilder && <AreaDropZone areaId={areaId} variant="start" />}
      {items.map((widget) => {
        const Component = getStorefrontWidget(widget.type);
        if (!Component) return null;
        const sortOrder = sortOrderFor(widget, areaId);
        return (
          <React.Fragment key={widget.uuid}>
            <WidgetChrome
              uuid={widget.uuid}
              type={widget.type}
              area={areaId}
              sortOrder={sortOrder}
              settings={widget.rawSettings}
            >
              <Component widget={widget} extra={extras?.[widget.uuid]} extras={extras} />
            </WidgetChrome>
            {editableInPageBuilder && <AreaDropZone areaId={areaId} afterUid={widget.uuid} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
