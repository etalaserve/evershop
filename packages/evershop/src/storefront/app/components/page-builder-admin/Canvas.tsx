import { forwardRef } from 'react';

/**
 * The live storefront page, in an iframe, with `?changeset=<token>` so its
 * loader overlays this draft's ops (`widgetsForRoute(route, changeset)`).
 * This IS the canvas — no separate render tree, see the plan's rationale
 * for keeping the iframe-as-canvas architecture instead of adopting
 * Craft.js/Puck/GrapesJS.
 */
export const Canvas = forwardRef<HTMLIFrameElement, { src: string }>(function Canvas({ src }, ref) {
  return (
    <iframe
      ref={ref}
      src={src}
      title="Page preview"
      className="h-full w-full border-0 bg-background"
    />
  );
});
