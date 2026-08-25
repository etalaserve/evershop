import { collectPuckNodes } from '../../../../lib/puck/collectNodes.js';
import { gql } from '~/lib/graphql/client.js';
import type { ProductCard } from '~/lib/graphql/queries/catalog.js';
import {
  CART_CROSS_SELL_QUERY,
  COLLECTION_PRODUCTS_WIDGET_QUERY,
  COLLECTION_SPOTLIGHT_WIDGET_QUERY,
  COLLECTION_STACK_WIDGET_QUERY,
  FEATURED_BLOGS_WIDGET_QUERY,
  LATEST_PRODUCTS_WIDGET_QUERY,
  PRODUCT_HERO_WIDGET_QUERY,
  TOP_CATEGORIES_WIDGET_QUERY,
  type CartCrossSellResponse,
  type CollectionProductsWidgetResponse,
  type CollectionSpotlightWidgetResponse,
  type CollectionStackWidgetResponse,
  type FeaturedBlogsWidgetResponse,
  type LatestProductsWidgetResponse,
  type ProductHeroWidgetResponse,
  type TopCategoriesWidgetResponse
} from '~/lib/graphql/queries/widgetExtras.js';
import type { ProductAnchor } from '~/lib/puck/metadata.js';

/**
 * `resolveWidgetExtras`' replacement for the Puck render path.
 *
 * Same eight GraphQL queries, same result shapes, same fail-soft behaviour —
 * the widget components are reused unchanged, so anything else here would
 * change what renders. Three things differ:
 *
 *  - It walks a Puck document via `collectPuckNodes` instead of
 *    `flattenWidgets`, so slots are traversed by Puck's own rules.
 *  - It keys on `props.id` rather than `widget.uuid`. Those are the same
 *    value — the converter preserves the uuid — so extras keys, e2e selectors
 *    and any external reference survive the cutover.
 *  - The three product-anchored types are resolved HERE rather than merged in
 *    afterwards by the product route (`mergeProductAnchorExtras`). Their
 *    anchor arrives as `anchor`, so they collapse into three more cases of the
 *    same switch instead of a second, separate code path the caller had to
 *    remember to run.
 *
 * Every case is wrapped so a widget with unresolvable settings (a deleted
 * collection, a removed product) renders nothing instead of taking the page
 * down with it.
 */
export type PuckExtras = Record<string, unknown>;

export interface ResolvePuckExtrasContext {
  /**
   * The visitor's request cookie, needed by `cart_frequently_bought_together`
   * to read *their* cart.
   *
   * SECURITY: that one type is per-visitor. Any caching layer placed around
   * this resolver, or around a loader that calls it, must exclude it — a
   * shared cache entry would serve one shopper's cart cross-sells to another.
   */
  cookie: string | null;
  /** Present on product routes only; drives the three product-anchored types. */
  anchor?: ProductAnchor;
}

/** Types resolved from their own props alone (plus the cookie, for the cart one). */
const SELF_CONTAINED_TYPES = new Set([
  'collection_products',
  'collection_stack',
  'collection_spotlight',
  'product_hero',
  'featured_blogs',
  'cart_frequently_bought_together',
  'latest_products',
  'top_categories'
]);

/** Types whose data is the current product's — resolved from `anchor`, no query. */
const PRODUCT_ANCHORED_TYPES = new Set([
  'related_products',
  'frequently_bought_together',
  'upsell_products'
]);

export async function resolvePuckExtras(
  data: unknown,
  config: unknown,
  ctx: ResolvePuckExtrasContext
): Promise<PuckExtras> {
  const nodes = collectPuckNodes(data, config).filter(
    (n) => SELF_CONTAINED_TYPES.has(n.type) || PRODUCT_ANCHORED_TYPES.has(n.type)
  );
  const extras: PuckExtras = {};

  await Promise.all(
    nodes.map(async (node) => {
      // Under Puck the props ARE the settings — flat, alongside `id`.
      const s = node.props;
      try {
        switch (node.type) {
          // --- product-anchored: no query, the route already fetched these ---
          case 'related_products':
          case 'frequently_bought_together':
          case 'upsell_products': {
            const anchor = ctx.anchor;
            if (!anchor) {
              // The type was placed on a route with no product to anchor to.
              // Null (not an empty product list) so the component takes its
              // "nothing to show" path rather than rendering a bare heading.
              extras[node.id] = null;
              break;
            }
            const source: ProductCard[] =
              node.type === 'related_products'
                ? anchor.relatedProducts
                : node.type === 'frequently_bought_together'
                  ? anchor.crossSellProducts
                  : anchor.upsellProducts;
            const limit = Number(s.limit) || source.length;
            extras[node.id] = { products: source.slice(0, limit) };
            break;
          }

          case 'cart_frequently_bought_together': {
            const res = await gql<CartCrossSellResponse>(
              CART_CROSS_SELL_QUERY,
              { limit: s.limit ?? 4 },
              ctx.cookie ? { Cookie: ctx.cookie } : undefined
            );
            extras[node.id] = { products: res.myCart?.crossSellProducts ?? [] };
            break;
          }
          case 'collection_products': {
            const res = await gql<CollectionProductsWidgetResponse>(
              COLLECTION_PRODUCTS_WIDGET_QUERY,
              {
                collection: s.collection ?? null,
                count: String(s.count ?? 4),
                heading: s.heading ?? null,
                subText: s.subText ?? null,
                viewAllLink: s.viewAllLink ?? null,
                viewAllLabel: s.viewAllLabel ?? null
              }
            );
            extras[node.id] = {
              heading:
                res.collectionProductsWidget?.heading || res.collection?.name || null,
              subText: res.collectionProductsWidget?.subText ?? null,
              description: res.collection?.description ?? null,
              viewAllLink: res.collectionProductsWidget?.viewAllLink ?? null,
              viewAllLabel: res.collectionProductsWidget?.viewAllLabel ?? null,
              products: res.collection?.products.items ?? []
            };
            break;
          }
          case 'collection_stack': {
            const res = await gql<CollectionStackWidgetResponse>(
              COLLECTION_STACK_WIDGET_QUERY,
              {
                collections: s.collections ?? [],
                productCount: s.productCount ?? 4,
                countPerRow: s.countPerRow ?? 4,
                divider: s.divider ?? true
              }
            );
            extras[node.id] = res.collectionStackWidget ?? {
              rows: [],
              countPerRow: 4,
              divider: true
            };
            break;
          }
          case 'collection_spotlight': {
            const res = await gql<CollectionSpotlightWidgetResponse>(
              COLLECTION_SPOTLIGHT_WIDGET_QUERY,
              {
                collection: s.collection ?? null,
                image: s.image ?? null,
                imageAlt: s.imageAlt ?? null,
                imagePosition: s.imagePosition ?? 'left',
                imageWidth: s.imageWidth ?? null,
                imageHeight: s.imageHeight ?? null,
                eyebrow: s.eyebrow ?? null,
                heading: s.heading ?? '',
                body: s.body ?? null,
                previewCount: s.previewCount ?? 4,
                viewAllLink: s.viewAllLink ?? null,
                viewAllLabel: s.viewAllLabel ?? null
              }
            );
            extras[node.id] = res.collectionSpotlightWidget;
            break;
          }
          case 'product_hero': {
            const res = await gql<ProductHeroWidgetResponse>(PRODUCT_HERO_WIDGET_QUERY, {
              productUuid: s.productUuid ?? null,
              image: s.image ?? null,
              imageAlt: s.imageAlt ?? null,
              imageWidth: s.imageWidth ?? null,
              imageHeight: s.imageHeight ?? null,
              eyebrow: s.eyebrow ?? null,
              copy: s.copy ?? null,
              imagePosition: s.imagePosition ?? 'left'
            });
            extras[node.id] = res.productHeroWidget;
            break;
          }
          case 'featured_blogs': {
            const res = await gql<FeaturedBlogsWidgetResponse>(
              FEATURED_BLOGS_WIDGET_QUERY,
              {
                eyebrow: s.eyebrow ?? null,
                heading: s.heading ?? null,
                subText: s.subText ?? null,
                postUuids: s.postUuids ?? [],
                count: s.count ?? 3,
                columns: s.columns ?? 3
              }
            );
            extras[node.id] = res.featuredBlogsWidget;
            break;
          }
          case 'latest_products': {
            const res = await gql<LatestProductsWidgetResponse>(
              LATEST_PRODUCTS_WIDGET_QUERY,
              { count: String(s.count ?? 8) }
            );
            // Same extra shape `CollectionProducts` reads (it backs both this
            // and `collection_products`); `description` is always null since
            // there's no collection entity to source rich text from.
            extras[node.id] = {
              heading:
                typeof s.heading === 'string' && s.heading ? s.heading : 'New arrivals',
              subText: s.subText ?? null,
              description: null,
              viewAllLink: s.viewAllLink ?? null,
              viewAllLabel: s.viewAllLabel ?? null,
              products: res.products.items
            };
            break;
          }
          case 'top_categories': {
            const res = await gql<TopCategoriesWidgetResponse>(TOP_CATEGORIES_WIDGET_QUERY);
            extras[node.id] = {
              heading: s.heading ?? null,
              categories: res.categories.items
            };
            break;
          }
          default:
            break;
        }
      } catch {
        extras[node.id] = null;
      }
    })
  );

  return extras;
}
