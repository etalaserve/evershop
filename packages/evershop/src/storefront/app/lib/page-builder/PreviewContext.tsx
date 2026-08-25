import React, { createContext, useContext, useState } from 'react';
import type { WidgetFragment } from '~/lib/graphql/queries/widgets.js';

/**
 * RR7 has no equivalent of the legacy system's mutable global
 * AppStateContext (which PageBuilderBridge.tsx pushed `data-update`
 * payloads into so every Area re-rendered from fresh data without a page
 * reload). Route data here comes from `useLoaderData()`, tied to the route
 * match — there's no built-in channel for a parent window to push replacement
 * data into it.
 *
 * This is the narrower replacement: a single context holding the widget list
 * plus the server-resolved `extras` map that goes with it (not the full
 * graphqlResponse/propsMap the legacy bridge also pushed — this storefront's
 * non-widget content isn't Area/propsMap-driven, so there's nothing else to
 * replace). `WidgetArea` prefers this context when present (i.e. inside the
 * page-builder iframe, once the bridge has received at least one
 * `data-update`) and falls back to whatever the page's own loader fetched
 * otherwise — which is every render outside the iframe, and the iframe's own
 * first paint before any edit.
 *
 * Widgets and extras are ONE state object on purpose. Held as two separate
 * `useState`s they could land in different commits, rendering a widget for a
 * frame with its new settings but its predecessor's resolved data.
 */
export type PreviewWidget = WidgetFragment;

export interface PreviewSnapshot {
  widgets: PreviewWidget[];
  /** Server-resolved data for the recommendation/collection widget types, keyed by widget uuid. Empty object is valid — those types then render their own empty state. */
  extras: Record<string, unknown>;
}

interface PreviewContextValue {
  preview: PreviewSnapshot | null;
  setPreview: (snapshot: PreviewSnapshot) => void;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [preview, setPreview] = useState<PreviewSnapshot | null>(null);
  return (
    <PreviewContext.Provider value={{ preview, setPreview }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreviewSnapshot(): PreviewContextValue {
  const ctx = useContext(PreviewContext);
  if (!ctx) return { preview: null, setPreview: () => {} };
  return ctx;
}
