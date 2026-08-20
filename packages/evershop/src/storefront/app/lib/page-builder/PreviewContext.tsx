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
 * This is the narrower replacement: a single context holding just the
 * widget list (not the full graphqlResponse/propsMap the legacy bridge also
 * pushed — this storefront's non-widget content isn't Area/propsMap-driven,
 * so there's nothing else to replace). `WidgetArea` prefers this context's
 * widgets when present (i.e. inside the page-builder iframe, once the
 * bridge has received at least one `data-update`) and falls back to
 * whatever the page's own loader fetched otherwise — which is every render
 * outside the iframe, and the iframe's own first paint before any edit.
 */
export type PreviewWidget = WidgetFragment;

interface PreviewContextValue {
  widgets: PreviewWidget[] | null;
  setWidgets: (widgets: PreviewWidget[]) => void;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [widgets, setWidgets] = useState<PreviewWidget[] | null>(null);
  return (
    <PreviewContext.Provider value={{ widgets, setWidgets }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreviewWidgets(): PreviewContextValue {
  const ctx = useContext(PreviewContext);
  if (!ctx) return { widgets: null, setWidgets: () => {} };
  return ctx;
}
