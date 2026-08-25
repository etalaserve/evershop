import { walkTree } from '@puckeditor/core/rsc';
import { UrnService } from '../urn/index.js';

/**
 * Resolve URN-valued props in a Puck document to current storefront URLs.
 *
 * ## The bug this fixes
 *
 * Link-valued settings can hold URNs (`urn:evershop:catalog:category:<uuid>`)
 * — that is what the legacy LinkPicker writes and what theme manifests ship.
 * The legacy GraphQL layer resolved them via `resolveLink`, but it did so on
 * the *typed* widget fields; the storefront reads `rawSettings` (the raw
 * settings JSONB), so no resolution ever ran and a URN reached the browser as
 * a broken `href`. It affects every link-valued setting across ~10 widget
 * types, not one widget.
 *
 * ## Why resolution happens here and not in the data layer
 *
 * Only on the RENDER path, never on the editor's. The editor edits these props
 * directly; resolving before it reads them would mean saving persists the
 * resolved URL and destroys the URN, so the link would stop tracking the entity
 * and break the next time a category was renamed. Render resolves, edit stays
 * raw.
 *
 * ## Which strings are touched
 *
 * Only those where `UrnService.isValid()` is true. That gate is what makes a
 * type-agnostic walk safe: link-ness is not declared anywhere in
 * `fieldConfig.ts` (link fields are plain `type: 'text'`), so there is no
 * reliable way to know which props are hrefs — but a plain heading cannot
 * accidentally parse as a URN, so nothing but a real URN is ever rewritten.
 *
 * Note the limit of that: a plain-URL setting is passed through untouched,
 * which means `resolveLink`'s `isSafeUrl` guard does NOT get applied to
 * hand-authored `javascript:`/`data:` hrefs. That gap predates this function
 * (the storefront applies no guard at all today) and closing it needs
 * link-valued fields to be declared as such in `fieldConfig.ts`. Do not
 * "fix" it by routing every string through `resolveLink` — that would null out
 * ordinary text that happens to look like a relative URL.
 *
 * ## Shape
 *
 * Returns a NEW document; the input is never mutated, because it may be a
 * cached object shared across requests. An unresolvable URN (a deleted
 * category) becomes `null`, matching what the legacy resolver did — components
 * already treat a null link as "render no anchor".
 */

/** Resolves one link value; inject `resolveLink` bound to request-scoped loaders. */
export type LinkResolver = (value: string) => Promise<string | null>;

/** Collect every URN-valued string in a props tree, ignoring declared slots. */
function collectUrns(
  value: unknown,
  into: Set<string>,
  slotKeys?: Set<string>,
  depth = 0
): void {
  // Documents are shallow in practice (the deepest real nesting is
  // columns→links, two levels); the cap only stops a cyclic or pathological
  // object from spinning, since props come from JSONB and are not trusted to
  // be well-formed.
  if (depth > 12) return;

  if (typeof value === 'string') {
    if (UrnService.isValid(value)) into.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrns(item, into, undefined, depth + 1);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      // Slot props hold child COMPONENTS, which `walkTree` visits as their own
      // nodes. Descending would process them twice.
      if (slotKeys?.has(key)) continue;
      collectUrns(child, into, undefined, depth + 1);
    }
  }
}

/** Rebuild a props tree with resolved values substituted in. */
function substitute(
  value: unknown,
  resolved: Map<string, string | null>,
  slotKeys?: Set<string>,
  depth = 0
): unknown {
  if (depth > 12) return value;

  if (typeof value === 'string') {
    return resolved.has(value) ? resolved.get(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => substitute(item, resolved, undefined, depth + 1));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = slotKeys?.has(key)
        ? child
        : substitute(child, resolved, undefined, depth + 1);
    }
    return out;
  }
  return value;
}

function slotKeysFor(config: unknown, type: string): Set<string> {
  const fields =
    ((config as { components?: Record<string, { fields?: Record<string, { type?: string }> }> })
      .components?.[type]?.fields) ?? {};
  const out = new Set<string>();
  for (const [key, field] of Object.entries(fields)) {
    if (field?.type === 'slot') out.add(key);
  }
  return out;
}

export async function resolvePuckLinks<T>(
  data: T,
  config: unknown,
  resolveLinkValue: LinkResolver
): Promise<T> {
  // Pass 1 — collect. Gathering every URN up front lets them resolve in
  // parallel and deduplicates repeats (the same category linked from a menu
  // and a tile is one lookup), which also lets the underlying DataLoader
  // batch them into a single query instead of one per occurrence.
  const urns = new Set<string>();
  walkTree(data as never, config as never, (content) => {
    for (const item of content) {
      collectUrns(item.props, urns, slotKeysFor(config, item.type as string));
    }
    return content;
  });

  if (urns.size === 0) return data;

  // Pass 2 — resolve.
  const list = [...urns];
  const results = await Promise.all(
    list.map(async (urn) => {
      try {
        return await resolveLinkValue(urn);
      } catch {
        // A failed lookup suppresses the link rather than failing the page.
        return null;
      }
    })
  );
  const resolved = new Map<string, string | null>();
  list.forEach((urn, i) => resolved.set(urn, results[i]));

  // Pass 3 — substitute, building new objects throughout.
  return walkTree(data as never, config as never, (content) =>
    content.map((item) => ({
      ...item,
      props: substitute(
        item.props,
        resolved,
        slotKeysFor(config, item.type as string)
      ) as typeof item.props
    }))
  ) as T;
}
