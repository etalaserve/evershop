import type {
  ProductCard,
  ProductDetailResponse
} from '~/lib/graphql/queries/catalog.js';
import type { CartResponse } from '~/lib/graphql/queries/cart.js';
import type { BlogPostDetailResponse } from '~/lib/graphql/queries/blog.js';
import type { CurrentCustomerResponse } from '~/lib/graphql/queries/customer.js';

/** The product a PDP is about, as the detail query returns it. */
export type ProductDetail = ProductDetailResponse['productByUrlKey'];

/**
 * The contract between a route loader and the components inside a Puck
 * document.
 *
 * Puck passes `metadata` verbatim to every component's `render`, including
 * nested slot children, reachable as `props.puck.metadata` (verified in
 * `lib/puck/tests/unit/puckContract.test.ts`). That makes it the one channel
 * for everything a component needs but cannot store in its own props.
 *
 * **Data resolution stays in the loader.** Puck's `resolveData` is an
 * editor-time hook, not an SSR data layer — using it for render would break
 * SSR and bypass the existing `cached()` wrappers. `<Render>` stays a pure
 * function of `(config, data, metadata)`: the loader fetches, this object
 * carries, components read.
 *
 * The type grows as routes migrate. It deliberately declares only fields with
 * a real consumer today rather than the full eventual shape — an unpopulated
 * field that components start reading is worse than a missing one, because
 * `undefined` renders as empty rather than failing.
 */
export interface PuckMetadata {
  /**
   * `render` on the storefront, `edit` inside the editor canvas.
   *
   * Components use this for edit-only affordances — a placeholder skeleton
   * where live data would be, a labelled sample entity. Never for anything
   * that changes what a shopper sees, or the editor stops being a preview of
   * production.
   */
  mode: 'render' | 'edit';

  /**
   * Server-resolved data, keyed by `props.id` — which the converter set to the
   * original `widget_instance.uuid`, so these keys survive the cutover
   * unchanged. Populated by `resolvePuckExtras`.
   *
   * A key present with value `null` means "resolution was attempted and
   * failed" (a deleted collection, say); a key that is absent means the
   * component needs no extras. Components must treat both as "render nothing
   * rather than crash".
   */
  extras: Record<string, unknown>;

  /** The page this document is being rendered on. */
  page: {
    /** The route id the document belongs to, e.g. `productView`. */
    routeId: string;
    /**
     * The product this page is about, on product routes only.
     *
     * Serves two distinct consumers, which is why it carries both halves:
     *
     *  - `detail` is the product entity itself, read by the commerce
     *    components (gallery, price, add-to-cart). Those render page furniture
     *    that has no settings of its own — everything they show comes from
     *    here, so without it they have nothing to draw.
     *  - the recommendation arrays let the three product-anchored widgets
     *    (`related_products`, `frequently_bought_together`, `upsell_products`)
     *    stop being a special case. Under the widget pipeline the product
     *    route had to merge them in separately via `mergeProductAnchorExtras`,
     *    because their data comes from `PRODUCT_DETAIL_QUERY` rather than a
     *    per-widget query. As metadata they are just an input to the same
     *    resolver.
     *
     * Absent in the editor, where there is no real product to render — the
     * commerce components fall back to an edit-mode placeholder rather than
     * inventing a sample entity that could be mistaken for real data.
     */
    product?: ProductPageContext;

    /**
     * A paginated product listing — category pages and search results.
     *
     * Both routes render the identical shape (a heading with a count, then a
     * grid), so they share one context and one pair of components rather than
     * duplicating them per route. The route decides what the heading SAYS;
     * the components only know they are showing a listing.
     */
    listing?: ListingPageContext;

    /** The visitor's cart, on the cart page. */
    cart?: CartPageContext;

    /** The post, on a blog post page. */
    post?: BlogPostPageContext;

    /** The signed-in customer, on account pages. */
    customer?: CustomerPageContext;
  };
}

/** A product listing, shared by category and search. */
export interface ListingPageContext {
  title: string;
  /** Secondary line under the title, e.g. a result count. Null hides it. */
  subtitle: string | null;
  products: ProductCard[];
  total: number;
}

/** The cart page's context. `isEmpty` is derived once here so components agree on it. */
export interface CartPageContext {
  cart: CartResponse['myCart'];
  isEmpty: boolean;
}

export interface BlogPostPageContext {
  post: BlogPostDetailResponse['blogPostByUrlKey'];
}

export interface CustomerPageContext {
  customer: CurrentCustomerResponse['currentCustomer'];
}

/** The already-fetched recommendation arrays a product page hands to the resolver. */
export interface ProductAnchor {
  relatedProducts: ProductCard[];
  crossSellProducts: ProductCard[];
  upsellProducts: ProductCard[];
}

/** Everything a product page's components need about the product. */
export interface ProductPageContext extends ProductAnchor {
  detail: ProductDetail;
}
