import { PRODUCT_CARD_FIELDS, type ProductCard } from './catalog.js';
import { BLOG_POST_CARD_FIELDS, type BlogPostCard } from './blog.js';

/**
 * Queries for the 6 "self-contained" recommendation widgets — their data
 * doesn't depend on page context (route/current-product/cart), only on the
 * widget's own `rawSettings` (a collection code, a product uuid, picked
 * post uuids...). Each returns fully-resolved product/collection/post data
 * server-side, unlike the plain-JSON `rawSettings` the other 17 widget
 * types carry. See `resolveWidgetExtras.ts` for how these get called once
 * per matching widget instance and merged into a `Record<uuid, ...>` map.
 *
 * `related_products`/`frequently_bought_together`/`upsell_products` are
 * NOT here — they're anchored to "the current product", so they piggyback
 * on `PRODUCT_DETAIL_QUERY`'s own `relatedProducts`/`crossSellProducts`/
 * `upsellProducts` fields instead (see `catalog.ts`). `cart_frequently_bought_together`
 * IS here — its anchor (the visitor's cart) resolves from the request's
 * own cookie, no page context needed.
 */

export const CART_CROSS_SELL_QUERY = /* GraphQL */ `
  query CartCrossSell($limit: Int) {
    myCart {
      crossSellProducts(limit: $limit) {
        ${PRODUCT_CARD_FIELDS}
      }
    }
  }
`;
export interface CartCrossSellResponse {
  myCart: { crossSellProducts: ProductCard[] } | null;
}

export const COLLECTION_PRODUCTS_WIDGET_QUERY = /* GraphQL */ `
  query CollectionProductsWidget($collection: String, $count: ID, $heading: String, $subText: String, $viewAllLink: String, $viewAllLabel: String) {
    collectionProductsWidget(collection: $collection, heading: $heading, subText: $subText, viewAllLink: $viewAllLink, viewAllLabel: $viewAllLabel) {
      heading
      subText
      viewAllLink
      viewAllLabel
    }
    collection(code: $collection) {
      name
      description
      products(filters: [{ key: "limit", operation: eq, value: $count }]) {
        items {
          ${PRODUCT_CARD_FIELDS}
        }
      }
    }
  }
`;
export interface CollectionProductsWidgetResponse {
  collectionProductsWidget: { heading: string | null; subText: string | null; viewAllLink: string | null; viewAllLabel: string | null } | null;
  collection: { name: string; description: unknown; products: { items: ProductCard[] } } | null;
}

export const COLLECTION_STACK_WIDGET_QUERY = /* GraphQL */ `
  query CollectionStackWidget($collections: JSON, $productCount: Int, $countPerRow: Int, $divider: Boolean) {
    collectionStackWidget(collections: $collections, productCount: $productCount, countPerRow: $countPerRow, divider: $divider) {
      countPerRow
      divider
      rows {
        id
        title
        subText
        viewAllLink
        viewAllLabel
        products {
          ${PRODUCT_CARD_FIELDS}
        }
      }
    }
  }
`;
export interface CollectionStackWidgetResponse {
  collectionStackWidget: {
    countPerRow: number;
    divider: boolean;
    rows: Array<{ id: string; title: string; subText: string | null; viewAllLink: string | null; viewAllLabel: string | null; products: ProductCard[] }>;
  } | null;
}

export const COLLECTION_SPOTLIGHT_WIDGET_QUERY = /* GraphQL */ `
  query CollectionSpotlightWidget(
    $collection: String
    $image: String
    $imageAlt: String
    $imagePosition: String
    $imageWidth: Float
    $imageHeight: Float
    $eyebrow: String
    $heading: String
    $body: String
    $previewCount: Int
    $viewAllLink: String
    $viewAllLabel: String
  ) {
    collectionSpotlightWidget(
      collection: $collection
      image: $image
      imageAlt: $imageAlt
      imagePosition: $imagePosition
      imageWidth: $imageWidth
      imageHeight: $imageHeight
      eyebrow: $eyebrow
      heading: $heading
      body: $body
      previewCount: $previewCount
      viewAllLink: $viewAllLink
      viewAllLabel: $viewAllLabel
    ) {
      image
      imageAlt
      imagePosition
      imageWidth
      imageHeight
      eyebrow
      heading
      body
      collectionName
      totalProducts
      viewAllLink
      viewAllLabel
      previewProducts {
        ${PRODUCT_CARD_FIELDS}
      }
    }
  }
`;
export interface CollectionSpotlightWidgetResponse {
  collectionSpotlightWidget: {
    image: string | null;
    imageAlt: string | null;
    imagePosition: string;
    imageWidth: number | null;
    imageHeight: number | null;
    eyebrow: string | null;
    heading: string;
    body: string | null;
    collectionName: string | null;
    totalProducts: number;
    viewAllLink: string | null;
    viewAllLabel: string | null;
    previewProducts: ProductCard[];
  } | null;
}

export const PRODUCT_HERO_WIDGET_QUERY = /* GraphQL */ `
  query ProductHeroWidget(
    $productUuid: String
    $image: String
    $imageAlt: String
    $imageWidth: Float
    $imageHeight: Float
    $eyebrow: String
    $copy: String
    $imagePosition: String
  ) {
    productHeroWidget(
      productUuid: $productUuid
      image: $image
      imageAlt: $imageAlt
      imageWidth: $imageWidth
      imageHeight: $imageHeight
      eyebrow: $eyebrow
      copy: $copy
      imagePosition: $imagePosition
    ) {
      image
      imageAlt
      imageWidth
      imageHeight
      eyebrow
      copy
      imagePosition
      product {
        ${PRODUCT_CARD_FIELDS}
      }
    }
  }
`;
export interface ProductHeroWidgetResponse {
  productHeroWidget: {
    image: string | null;
    imageAlt: string | null;
    imageWidth: number | null;
    imageHeight: number | null;
    eyebrow: string | null;
    copy: string | null;
    imagePosition: string;
    product: ProductCard | null;
  } | null;
}

export const FEATURED_BLOGS_WIDGET_QUERY = /* GraphQL */ `
  query FeaturedBlogsWidget($eyebrow: String, $heading: String, $subText: String, $postUuids: [String], $count: Int, $columns: Int) {
    featuredBlogsWidget(eyebrow: $eyebrow, heading: $heading, subText: $subText, postUuids: $postUuids, count: $count, columns: $columns) {
      eyebrow
      heading
      subText
      columns
      posts {
        ${BLOG_POST_CARD_FIELDS}
      }
    }
  }
`;
export interface FeaturedBlogsWidgetResponse {
  featuredBlogsWidget: { eyebrow: string | null; heading: string | null; subText: string | null; columns: number; posts: BlogPostCard[] } | null;
}
