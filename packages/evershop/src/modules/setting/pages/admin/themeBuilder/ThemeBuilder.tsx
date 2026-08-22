import React from 'react';

/**
 * Retired — the merchant-facing theme editor now lives inside the
 * page-builder ("Theme" button in the topbar at `/admin/page-builder/edit/:routeId`),
 * with a real live preview against the actual storefront canvas instead of
 * this page's mockup, and a single `themeTokens` write path instead of two
 * editors able to silently clobber each other's saves. This page just
 * forwards here now; `route.json`/`index.ts` registration is unchanged so
 * any bookmarked link still resolves.
 */
export default function ThemeBuilder() {
  React.useEffect(() => {
    window.location.href = '/admin/page-builder/edit/homepage';
  }, []);
  return null;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
