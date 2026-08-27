import React from 'react';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

/**
 * The two regions of site-wide content: above every page, and below it.
 *
 * This component exists to give globals a shape a merchant can see. On the
 * storefront it is never rendered — the render path splits its slots out and
 * splices them around the route's own content (`lib/puck/mergeGlobals.ts`), so
 * a global announcement bar sits at the top of the page rather than nested
 * inside a wrapper.
 *
 * It renders only in the editor, when editing the synthetic `all` route, where
 * both regions are shown stacked and labelled. That labelling is the whole
 * point: "before" and "after" mean nothing as bare drop zones.
 */
export function GlobalRegions({ namedSlots }: WidgetComponentProps) {
  const Before = namedSlots?.before;
  const After = namedSlots?.after;

  return (
    <div className="space-y-6">
      <Region label="Above every page" Slot={Before} />
      <Region label="Below every page" Slot={After} />
    </div>
  );
}

function Region({
  label,
  Slot
}: {
  label: string;
  Slot?: React.ComponentType;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="rounded-lg border border-dashed border-border p-3">
        {Slot ? <Slot /> : null}
      </div>
    </div>
  );
}
