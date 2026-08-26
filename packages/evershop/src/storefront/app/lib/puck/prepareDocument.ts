import { createLinkLoaders, resolveLink } from '../../../../lib/widget/linkResolver.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { resolvePuckLinks } from '../../../../lib/puck/resolvePuckLinks.js';
import { resolvePuckExtras } from '~/lib/widgets/resolvePuckExtras.js';
import { buildPuckConfig } from '~/lib/puck/buildPuckConfig.js';
import type {
  BlogPostPageContext,
  CartPageContext,
  CustomerPageContext,
  ListingPageContext,
  ProductPageContext,
  PuckMetadata
} from '~/lib/puck/metadata.js';
import type { PuckDocumentData } from '~/lib/puck/loadPuckDocument.js';

/**
 * Turn a stored Puck document into everything `<PuckArea>` needs to render it.
 *
 * Server-only, called from route loaders. Does the two things that must happen
 * on the render path and nowhere else:
 *
 *  1. Resolves URN-valued props to current storefront URLs. Render-path only —
 *     the editor must keep the raw URNs, or saving would persist a resolved
 *     URL and the link would stop tracking its entity.
 *  2. Resolves the commerce widgets' server-side data into an extras map.
 *
 * Both walk the same document with the same config, so they cannot disagree
 * about the tree. The config is built once here and shared, rather than each
 * of them rebuilding it.
 *
 * Order matters: links are resolved BEFORE extras. Extras resolution reads
 * props (a collection code, a picked product uuid) and passes some of them
 * through to the rendered output — resolving links first means a settings
 * value carrying a URN is already a URL by the time it is read.
 */
export async function prepareDocumentForRender(
  data: PuckDocumentData,
  ctx: {
    routeId: string;
    cookie: string | null;
    /** Product routes only — the product entity plus its recommendation arrays. */
    product?: ProductPageContext;
    listing?: ListingPageContext;
    cart?: CartPageContext;
    post?: BlogPostPageContext;
    customer?: CustomerPageContext;
  }
): Promise<{ data: PuckDocumentData; metadata: PuckMetadata }> {
  const config = buildPuckConfig();

  // Loaders are created per request on purpose: they memoize, which is what
  // batches repeat lookups within one page, and must NOT outlive the request
  // or a renamed category would keep resolving to its old URL.
  const loaders = createLinkLoaders(pool);
  const resolved = await resolvePuckLinks(data, config, (value) =>
    resolveLink(value, loaders)
  );

  // The extras resolver only needs the recommendation arrays; the entity
  // itself is for the commerce components and travels in metadata.
  const extras = await resolvePuckExtras(resolved, config, {
    cookie: ctx.cookie,
    anchor: ctx.product
  });

  return {
    data: resolved,
    metadata: {
      mode: 'render',
      extras,
      // Each key is omitted rather than set to undefined when absent, so a
      // component testing `page.cart` cannot be fooled by a present-but-empty
      // context on a route that has none.
      page: {
        routeId: ctx.routeId,
        ...(ctx.product ? { product: ctx.product } : {}),
        ...(ctx.listing ? { listing: ctx.listing } : {}),
        ...(ctx.cart ? { cart: ctx.cart } : {}),
        ...(ctx.post ? { post: ctx.post } : {}),
        ...(ctx.customer ? { customer: ctx.customer } : {})
      }
    }
  };
}
