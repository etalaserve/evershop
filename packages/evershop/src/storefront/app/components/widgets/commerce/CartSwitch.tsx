import React from 'react';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

/**
 * Shows one of two compositions depending on whether the cart has items.
 *
 * The cart route branched in JSX and mounted its widget area twice, in
 * mutually exclusive arms. A document cannot branch — it is data — so the
 * branch becomes a component with two named slots, and the merchant composes
 * both arms.
 *
 * In the EDITOR both arms render, stacked and labelled. Showing only one would
 * make the other unreachable: a merchant cannot add an empty-cart message if
 * the canvas only ever draws the filled state, and the editor has no real cart
 * to switch on anyway.
 */
export function CartSwitch({ page, namedSlots }: WidgetComponentProps) {
  const WhenEmpty = namedSlots?.whenEmpty;
  const WhenFilled = namedSlots?.whenFilled;

  // No cart context at all means the editor (or a route that has no cart).
  // Render both arms so each is composable.
  if (!page?.cart) {
    return (
      <div className="space-y-6">
        <SlotPreview label="Shown when the cart is empty" Slot={WhenEmpty} />
        <SlotPreview label="Shown when the cart has items" Slot={WhenFilled} />
      </div>
    );
  }

  const Active = page.cart.isEmpty ? WhenEmpty : WhenFilled;
  return Active ? <Active /> : null;
}

function SlotPreview({
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
