import React from 'react';
import type { WidgetFragment } from '~/lib/graphql/queries/widgets.js';
import type { PuckMetadata } from '~/lib/puck/metadata.js';

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
  /**
   * Pre-rendered children per column index, supplied ONLY when the component
   * is rendered by Puck.
   *
   * The widget pipeline nests children via `widget.columns[i].widgets` and a
   * nested `<WidgetArea>` keyed on the synthetic
   * `columnsContainer_<uuid>_col_<i>` area. Puck nests them as slot props
   * instead, and hands `render()` a component per slot rather than data. A
   * container therefore has to render whichever it was given — without this,
   * a Puck-rendered Columns would silently produce empty columns, since
   * `widget.columns` is `[]` under Puck.
   *
   * Undefined in the widget pipeline, so that path is unchanged.
   */
  slots?: Record<number, React.ComponentType>;
  /**
   * The page context the document is rendering in — route id, and the product
   * on a PDP. Supplied ONLY by Puck.
   *
   * Commerce components (gallery, price, add-to-cart) are page furniture with
   * no settings of their own: everything they draw comes from the entity the
   * page is about, which is not something a widget can store. Content widgets
   * ignore this.
   *
   * Absent in the editor, where there is no real entity — components render an
   * edit-mode placeholder rather than inventing sample data.
   */
  page?: PuckMetadata['page'];
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
