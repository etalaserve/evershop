import React from 'react';

import type { WidgetFragment } from '~/lib/graphql/queries/widgets.js';

export interface WidgetComponentProps {
  widget: WidgetFragment;
  /**
   * Server-resolved data for widgets whose content isn't fully described by
   * `rawSettings` alone — the recommendation/collection widgets (live
   * product/post data). Populated by `resolveWidgetExtras`/
   * `mergeProductAnchorExtras`, keyed by `widget.uuid`, threaded through
   * `WidgetArea`. `undefined` for every other widget type.
   */
  extra?: unknown;
  /** The full uuid-keyed extras map — only container widgets (Columns/Section) need this, to pass down into their nested `WidgetArea`. */
  extras?: Record<string, unknown>;
}

export type WidgetComponent = React.ComponentType<WidgetComponentProps>;

const registry: Record<string, WidgetComponent> = {};

/** Extension point — mirrors the legacy `registerWidget()` on the storefront side. */
export function registerStorefrontWidget(type: string, component: WidgetComponent): void {
  registry[type] = component;
}

export function getStorefrontWidget(type: string): WidgetComponent | undefined {
  return registry[type];
}
