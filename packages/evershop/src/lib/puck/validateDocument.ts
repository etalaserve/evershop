/**
 * Route-level guarantees about what a Puck document must contain.
 *
 * ## Why this exists
 *
 * Under the widget model a merchant could only ever ADD to a commerce page —
 * the add-to-cart button, the price, the gallery were part of the route's own
 * template and were not editable. Once those become Puck components so the
 * page is fully composable, they also become deletable, and a merchant who
 * removes add-to-cart has silently broken the ability to buy anything.
 *
 * Puck's per-component `permissions: { delete: false }` is a UI affordance,
 * not a guarantee: the operations endpoint is reachable directly, and a
 * document can also arrive from a theme install or a converted row. This is
 * the enforcement point.
 *
 * ## Where it runs
 *
 * At the write endpoint (every page-builder mutation funnels through
 * `addChangesetOperation`) and again at publish, because a changeset can hold
 * an op that was valid when written and is not when published — the same
 * defence-in-depth reasoning as `assertRowThemeMatches`.
 *
 * ## The table is deliberately empty
 *
 * Requirements are added per route as that route's commerce components land
 * (Phase 5: productView, then categoryView, cart, blogPostView, search,
 * account). Populating it before the components exist would reject every save
 * on those routes, since no document could satisfy a rule naming a component
 * that is not registered yet.
 *
 * `checkout` is permanently absent by decision, not by omission: it mounts no
 * editable area at all, because a merchant-editable checkout is an
 * unacceptable failure mode.
 */

/** routeId → component types that must be present somewhere in the document. */
export const REQUIRED_COMPONENTS: Record<string, string[]> = {
  // Populated as Phase 5 lands each route, e.g.:
  //   productView: ['ProductAddToCart']
};

/**
 * Every component type in a document, at any depth.
 *
 * Walks the raw structure rather than using Puck's `walkTree`, because this
 * runs in the API layer, which has no access to the storefront's generated
 * config — and `walkTree` needs one to know which props hold slots. A
 * config-free walk is also the safer choice here: an unknown container type
 * still has its children inspected, where a config-driven walk would skip
 * slots it did not know about and could pass a document whose only
 * add-to-cart sits inside one.
 */
export function collectComponentTypes(node: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) collectComponentTypes(item, into);
    return into;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (typeof obj.type === 'string' && obj.props && typeof obj.props === 'object') {
      into.add(obj.type);
    }
    for (const value of Object.values(obj)) collectComponentTypes(value, into);
  }
  return into;
}

/**
 * Which required components a document is missing for its route.
 *
 * Returns an empty array for a route with no requirements, which is every
 * route today.
 */
export function findMissingRequired(
  route: string,
  data: unknown,
  required: Record<string, string[]> = REQUIRED_COMPONENTS
): string[] {
  const rules = required[route];
  if (!rules || rules.length === 0) return [];

  // A deleted document (null data) satisfies nothing. Treated as missing
  // everything rather than as "no rules apply" — deleting the document is
  // exactly how a merchant would remove a required component wholesale.
  if (data === null || data === undefined) return [...rules];

  const present = collectComponentTypes(data);
  return rules.filter((type) => !present.has(type));
}
