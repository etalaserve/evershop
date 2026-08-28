import { loadPuckDocument } from '~/lib/puck/loadPuckDocument.js';
import { prepareDocumentForRender } from '~/lib/puck/prepareDocument.js';
import type {
  BlogPostPageContext,
  CartPageContext,
  CustomerPageContext,
  ListingPageContext,
  ProductPageContext,
  PuckMetadata
} from '~/lib/puck/metadata.js';
import type { PuckDocumentData } from '~/lib/puck/loadPuckDocument.js';
import { mergeGlobalsIntoRoute } from '../../../../lib/puck/mergeGlobals.js';

/** The synthetic route id whose document holds site-wide content. */
export const GLOBAL_ROUTE = 'all';

/** Used when only globals exist, so a route with no document of its own still shows them. */
const EMPTY_DOCUMENT: PuckDocumentData = { content: [], root: { props: {} } };

/**
 * Cut over: every request renders a route's area from `puck_document`
 * unconditionally — no `?__engine=puck` opt-in any more.
 *
 * **Still falls back to the widget pipeline** when a route has neither its
 * own document nor any globals (nothing has been backfilled or authored for
 * it yet), rather than rendering a blank page — see the `null` return below.
 * That fallback is the only remaining difference from a full removal, kept
 * deliberately as a safety net for a route nobody has touched in Puck yet;
 * every route this store actually has content for (`homepage`, `productView`
 * — see `backfillPuckDocuments`) already renders through Puck.
 *
 * This exists as a helper rather than inline in each route so the switch
 * reads as one line per route, matching the nine call sites in
 * `app/routes/*.tsx`.
 */
export async function loadPuckForRequest(
  request: Request,
  routeId: string,
  opts: {
    /**
     * Product routes only. Carries both the product entity the commerce
     * components render from and the recommendation arrays the three
     * product-anchored widget types resolve against.
     */
    product?: ProductPageContext;
    /** Category and search — the listing being shown. */
    listing?: ListingPageContext;
    /** The cart page. */
    cart?: CartPageContext;
    /** A blog post page. */
    post?: BlogPostPageContext;
    /** Account pages. */
    customer?: CustomerPageContext;
    /** Entity-scoped routes (landing pages); NULL means the route default. */
    scopeUrn?: string | null;
  } = {}
): Promise<{ data: PuckDocumentData; metadata: PuckMetadata } | null> {
  /**
   * The route's own document and the site-wide one, in parallel.
   *
   * Globals live in a document with `route = 'all'` and are spliced around the
   * route's content here — on the RENDER path only. The editing path
   * (`loadPuckDocumentForEditing`) deliberately does not merge: if it did, a
   * merchant editing `homepage` would save the site-wide content into the
   * homepage document, silently copying globals into one page and then
   * diverging from them.
   */
  const [stored, globals] = await Promise.all([
    loadPuckDocument(routeId, opts.scopeUrn ?? null),
    loadPuckDocument(GLOBAL_ROUTE, null)
  ]);

  // Nothing to render at all — no route document and no globals.
  if (!stored && !globals) return null;

  const merged = mergeGlobalsIntoRoute(stored ?? EMPTY_DOCUMENT, globals);

  return prepareDocumentForRender(merged, {
    routeId,
    cookie: request.headers.get('Cookie'),
    product: opts.product,
    listing: opts.listing,
    cart: opts.cart,
    post: opts.post,
    customer: opts.customer
  });
}
