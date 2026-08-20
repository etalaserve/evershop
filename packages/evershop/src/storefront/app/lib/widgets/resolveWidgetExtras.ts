import { gql } from '~/lib/graphql/client.js';
import type { ProductCard } from '~/lib/graphql/queries/catalog.js';
import {
  CART_CROSS_SELL_QUERY,
  COLLECTION_PRODUCTS_WIDGET_QUERY,
  COLLECTION_SPOTLIGHT_WIDGET_QUERY,
  COLLECTION_STACK_WIDGET_QUERY,
  FEATURED_BLOGS_WIDGET_QUERY,
  PRODUCT_HERO_WIDGET_QUERY,
  type CartCrossSellResponse,
  type CollectionProductsWidgetResponse,
  type CollectionSpotlightWidgetResponse,
  type CollectionStackWidgetResponse,
  type FeaturedBlogsWidgetResponse,
  type ProductHeroWidgetResponse
} from '~/lib/graphql/queries/widgetExtras.js';
import type { WidgetFragment } from '~/lib/graphql/queries/widgets.js';
import { flattenWidgets } from './flatten.js';

const SELF_CONTAINED_TYPES = new Set([
  'collection_products',
  'collection_stack',
  'collection_spotlight',
  'product_hero',
  'featured_blogs',
  'cart_frequently_bought_together'
]);

/** Route id → widget type → extra resolved data, so `WidgetArea` can pass it into the matching component alongside `rawSettings`. */
export type WidgetExtras = Record<string, unknown>;

/**
 * Server-side data fetch for the 6 recommendation widget types whose data
 * doesn't depend on page context — only their own `rawSettings` (a
 * collection code, a picked product uuid, picked post uuids) plus, for the
 * cart-anchored one, the visitor's own cart (resolved from `cookie`).
 *
 * The other 3 recommendation types — `related_products`,
 * `frequently_bought_together`, `upsell_products` — are anchored to "the
 * current product" and are NOT resolved here; the product page loader
 * merges those in separately from its own already-fetched
 * `relatedProducts`/`crossSellProducts`/`upsellProducts` arrays (see
 * `mergeProductAnchorExtras` below) since that data comes from
 * `PRODUCT_DETAIL_QUERY`, not a per-widget query.
 */
export async function resolveWidgetExtras(widgets: WidgetFragment[], cookie: string | null): Promise<WidgetExtras> {
  const targets = flattenWidgets(widgets).filter((w) => SELF_CONTAINED_TYPES.has(w.type));
  const extras: WidgetExtras = {};

  await Promise.all(
    targets.map(async (widget) => {
      const s = widget.rawSettings as Record<string, unknown>;
      try {
        switch (widget.type) {
          case 'cart_frequently_bought_together': {
            const res = await gql<CartCrossSellResponse>(CART_CROSS_SELL_QUERY, { limit: s.limit ?? 4 }, cookie ? { Cookie: cookie } : undefined);
            extras[widget.uuid] = { products: res.myCart?.crossSellProducts ?? [] };
            break;
          }
          case 'collection_products': {
            const res = await gql<CollectionProductsWidgetResponse>(COLLECTION_PRODUCTS_WIDGET_QUERY, {
              collection: s.collection ?? null,
              count: String(s.count ?? 4),
              heading: s.heading ?? null,
              subText: s.subText ?? null,
              viewAllLink: s.viewAllLink ?? null,
              viewAllLabel: s.viewAllLabel ?? null
            });
            extras[widget.uuid] = {
              heading: res.collectionProductsWidget?.heading || res.collection?.name || null,
              subText: res.collectionProductsWidget?.subText ?? null,
              description: res.collection?.description ?? null,
              viewAllLink: res.collectionProductsWidget?.viewAllLink ?? null,
              viewAllLabel: res.collectionProductsWidget?.viewAllLabel ?? null,
              products: res.collection?.products.items ?? []
            };
            break;
          }
          case 'collection_stack': {
            const res = await gql<CollectionStackWidgetResponse>(COLLECTION_STACK_WIDGET_QUERY, {
              collections: s.collections ?? [],
              productCount: s.productCount ?? 4,
              countPerRow: s.countPerRow ?? 4,
              divider: s.divider ?? true
            });
            extras[widget.uuid] = res.collectionStackWidget ?? { rows: [], countPerRow: 4, divider: true };
            break;
          }
          case 'collection_spotlight': {
            const res = await gql<CollectionSpotlightWidgetResponse>(COLLECTION_SPOTLIGHT_WIDGET_QUERY, {
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
            });
            extras[widget.uuid] = res.collectionSpotlightWidget;
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
            extras[widget.uuid] = res.productHeroWidget;
            break;
          }
          case 'featured_blogs': {
            const res = await gql<FeaturedBlogsWidgetResponse>(FEATURED_BLOGS_WIDGET_QUERY, {
              eyebrow: s.eyebrow ?? null,
              heading: s.heading ?? null,
              subText: s.subText ?? null,
              postUuids: s.postUuids ?? [],
              count: s.count ?? 3,
              columns: s.columns ?? 3
            });
            extras[widget.uuid] = res.featuredBlogsWidget;
            break;
          }
          default:
            break;
        }
      } catch {
        // A widget with unresolvable settings (e.g. a deleted collection)
        // renders nothing rather than taking the whole page down.
        extras[widget.uuid] = null;
      }
    })
  );

  return extras;
}

/**
 * Merges the product-anchored recommendation widgets (`related_products`,
 * `frequently_bought_together`, `upsell_products`) into an extras map,
 * using arrays the product page already fetched via `PRODUCT_DETAIL_QUERY`
 * — these widgets have no meaningful anchor outside a product page, so
 * they're absent from `resolveWidgetExtras` entirely.
 */
export function mergeProductAnchorExtras(
  extras: WidgetExtras,
  widgets: WidgetFragment[],
  anchor: { relatedProducts: ProductCard[]; crossSellProducts: ProductCard[]; upsellProducts: ProductCard[] }
): WidgetExtras {
  const FIELD: Record<string, ProductCard[]> = {
    related_products: anchor.relatedProducts,
    frequently_bought_together: anchor.crossSellProducts,
    upsell_products: anchor.upsellProducts
  };
  const merged = { ...extras };
  for (const widget of flattenWidgets(widgets)) {
    const source = FIELD[widget.type];
    if (!source) continue;
    const limit = Number((widget.rawSettings as Record<string, unknown>).limit) || source.length;
    merged[widget.uuid] = { products: source.slice(0, limit) };
  }
  return merged;
}
