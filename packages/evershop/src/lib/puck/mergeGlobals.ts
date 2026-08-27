/**
 * Merge the site-wide (`route = 'all'`) document into a route's document.
 *
 * ## Why globals need a model of their own
 *
 * The widget model expressed "appears on every page" as
 * `widget_placement.route = 'all'`, and interleaved those placements with a
 * route's own by pure `sort_order`. The document model has no `sort_order` —
 * ordering IS array position — so that interleaving cannot be reproduced.
 *
 * Rather than invent a hidden ordering key, globals get two explicit regions:
 * content that renders above a route's own, and content that renders below.
 * That covers what globals are actually used for (an announcement bar, a
 * footer strip) and is legible in the editor, where "before" and "after" are
 * something a merchant can see and reason about.
 *
 * This is a deliberate change of semantics from the widget model, and it is
 * safe to make now precisely because no store has a content-area global yet —
 * the backfill has been reporting them as unmigratable rather than converting
 * them.
 *
 * ## Render-only
 *
 * The merge belongs to the RENDER path and must never run on the editing path.
 * If the editor merged, a merchant editing `homepage` would save the globals
 * into the homepage document — silently copying site-wide content into one
 * page and then diverging from it.
 *
 * ## Identity
 *
 * Component ids pass through untouched. They are the original
 * `widget_instance.uuid`, extras are keyed on them, and a global legitimately
 * appears with the same id on every page — the ids are unique within a
 * document, which is all that rendering requires.
 */

/** The container type whose two slots hold the global regions. */
export const GLOBAL_REGIONS_TYPE = 'global_regions';

interface ComponentLike {
  type?: unknown;
  props?: Record<string, unknown>;
}

interface DocumentLike {
  content?: unknown;
  root?: unknown;
}

function asComponentArray(value: unknown): ComponentLike[] {
  return Array.isArray(value) ? (value as ComponentLike[]) : [];
}

/**
 * Split a globals document into its before/after regions.
 *
 * Tolerant by design: top-level components that are not the `global_regions`
 * container count as "before". A globals document assembled by hand, by an
 * older backfill, or by a theme that predates the container should still show
 * its content somewhere visible rather than silently rendering nothing.
 */
export function splitGlobalRegions(globals: DocumentLike | null | undefined): {
  before: ComponentLike[];
  after: ComponentLike[];
} {
  const content = asComponentArray(globals?.content);
  if (content.length === 0) return { before: [], after: [] };

  const container = content.find((c) => c?.type === GLOBAL_REGIONS_TYPE);
  const loose = content.filter((c) => c?.type !== GLOBAL_REGIONS_TYPE);

  if (!container) return { before: loose, after: [] };

  return {
    before: [...asComponentArray(container.props?.before), ...loose],
    after: asComponentArray(container.props?.after)
  };
}

/**
 * Produce the document a route should actually render.
 *
 * Returns the route's own document unchanged when there are no globals, so the
 * overwhelmingly common case allocates nothing and stays referentially equal.
 */
export function mergeGlobalsIntoRoute<T extends DocumentLike>(
  routeDocument: T,
  globals: DocumentLike | null | undefined
): T {
  const { before, after } = splitGlobalRegions(globals);
  if (before.length === 0 && after.length === 0) return routeDocument;

  return {
    ...routeDocument,
    content: [...before, ...asComponentArray(routeDocument.content), ...after]
  };
}
