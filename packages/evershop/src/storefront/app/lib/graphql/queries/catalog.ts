export interface Money {
  value: number;
  text: string;
}

export interface ProductImage {
  url: string;
  alt: string | null;
}

export interface ProductCard {
  productId: number;
  uuid: string;
  name: string;
  sku: string;
  /** EverShop's own `url_key` column — the storefront builds its own `/product/:urlKey`
   *  link from this. EverShop's `url` field points at EverShop's *own* page routing
   *  (`buildUrl('productView', ...)` or its url_rewrite table), which has no relationship
   *  to this storefront's route structure, so it's never used for internal links. */
  urlKey: string;
  image: ProductImage | null;
  price: {
    regular: Money;
    special: Money | null;
  };
  inventory: {
    isInStock: boolean;
  };
}

export const PRODUCT_CARD_FIELDS = /* GraphQL */ `
  productId
  uuid
  name
  sku
  urlKey
  image {
    url
    alt
  }
  price {
    regular {
      value
      text
    }
    special {
      value
      text
    }
  }
  inventory {
    isInStock
  }
`;

/**
 * Filter keys below are constrained to what EverShop's collection filter
 * registries actually accept — `registerDefaultProductCollectionFilters` /
 * `registerDefaultCategoryCollectionFilters` / `defaultPaginationFilters`
 * (packages/evershop/src/modules/catalog/services, src/lib/util). There is
 * no `order_by`/`url_key`/`limit`-as-string-only convention — `page` and
 * `limit` are real filter keys, category/product sort is `ob` with a fixed
 * vocabulary (price/name/qty/status — no date), and `parent: null` (not the
 * string "0") is how root categories are selected (`parent_id IS NULL`).
 */
export const CATEGORY_NAV_QUERY = /* GraphQL */ `
  query CategoryNav {
    categories(filters: [{ key: "parent", operation: eq, value: null }]) {
      items {
        categoryId
        uuid
        name
        urlKey
        hasChildren
        children {
          categoryId
          uuid
          name
          urlKey
        }
      }
    }
  }
`;

export interface CategoryNavResponse {
  categories: {
    items: Array<{
      categoryId: number;
      uuid: string;
      name: string;
      urlKey: string;
      hasChildren: boolean;
      children: Array<{ categoryId: number; uuid: string; name: string; urlKey: string }>;
    }>;
  };
}

/**
 * The core `categories(filters:)` collection has no `url_key` filter (only
 * name/status/parent/ob — see `registerDefaultCategoryCollectionFilters`),
 * and `category(id:)` only takes a numeric id. `categoryByUrlKey` is a small
 * additive query added to EverShop specifically for this storefront
 * (`packages/evershop/src/modules/headless/graphql/types/CategoryLookup`) —
 * a direct slug lookup, the thing every headless client needs and the core
 * schema doesn't expose.
 */
export const CATEGORY_BY_URL_KEY_QUERY = /* GraphQL */ `
  query CategoryByUrlKey($urlKey: String!, $page: ID, $limit: ID) {
    categoryByUrlKey(urlKey: $urlKey) {
      categoryId
      uuid
      name
      description
      urlKey
      metaTitle
      metaDescription
      image {
        url
        alt
      }
      hasChildren
      children {
        categoryId
        name
        urlKey
      }
      priceRange {
        min
        max
      }
      products(
        filters: [
          { key: "page", operation: eq, value: $page }
          { key: "limit", operation: eq, value: $limit }
        ]
      ) {
        items {
          ${PRODUCT_CARD_FIELDS}
        }
        currentFilters {
          key
          value
        }
        total
      }
    }
  }
`;

export interface CategoryPageResponse {
  categoryByUrlKey: {
    categoryId: number;
    uuid: string;
    name: string;
    description: unknown;
    urlKey: string;
    metaTitle: string | null;
    metaDescription: string | null;
    image: ProductImage | null;
    hasChildren: boolean;
    children: Array<{ categoryId: number; name: string; urlKey: string }>;
    priceRange: { min: number; max: number } | null;
    products: {
      items: ProductCard[];
      currentFilters: Array<{ key: string; value: string }>;
      total: number;
    };
  } | null;
}

/**
 * Same rationale as `categoryByUrlKey` — `product(id:)` is numeric-only, so
 * this storefront calls the additive `productByUrlKey` query instead
 * (`packages/evershop/src/modules/headless/graphql/types/ProductLookup`).
 */
export const PRODUCT_DETAIL_QUERY = /* GraphQL */ `
  query ProductDetail($urlKey: String!) {
    productByUrlKey(urlKey: $urlKey) {
      productId
      uuid
      name
      sku
      description
      urlKey
      metaTitle
      metaDescription
      image {
        url
        alt
      }
      gallery {
        url
        alt
      }
      price {
        regular {
          value
          text
          currency
        }
        special {
          value
          text
        }
      }
      inventory {
        isInStock
        stockAvailability
      }
      attributes {
        attributeName
        attributeCode
        options {
          optionText
        }
      }
      variantGroup {
        variantAttributes {
          attributeCode
          attributeName
          options {
            optionId
            optionText
          }
        }
        items {
          id
          attributes {
            attributeCode
            optionId
            optionText
          }
          product {
            productId
            uuid
            urlKey
          }
        }
        addItemApi
      }
      relatedProducts(limit: 12) {
        ${PRODUCT_CARD_FIELDS}
      }
      crossSellProducts(limit: 12) {
        ${PRODUCT_CARD_FIELDS}
      }
      upsellProducts(limit: 12) {
        ${PRODUCT_CARD_FIELDS}
      }
    }
  }
`;

export interface ProductDetailResponse {
  productByUrlKey: {
    productId: number;
    uuid: string;
    name: string;
    sku: string;
    description: unknown;
    urlKey: string;
    metaTitle: string | null;
    metaDescription: string | null;
    image: ProductImage | null;
    gallery: ProductImage[];
    price: { regular: Money & { currency: string }; special: Money | null };
    inventory: { isInStock: boolean; stockAvailability: number };
    attributes: Array<{
      attributeName: string;
      attributeCode: string;
      options: Array<{ optionText: string }>;
    }>;
    variantGroup: {
      variantAttributes: Array<{
        attributeCode: string;
        attributeName: string;
        options: Array<{ optionId: number; optionText: string }>;
      }>;
      items: Array<{
        id: string;
        attributes: Array<{ attributeCode: string; optionId: number; optionText: string }>;
        product: { productId: number; uuid: string; urlKey: string };
      }>;
      addItemApi: string;
    } | null;
    relatedProducts: ProductCard[];
    crossSellProducts: ProductCard[];
    upsellProducts: ProductCard[];
  } | null;
}

/**
 * `productSearch` (the schema's dedicated search type) only resolves when
 * `currentRoute.id === 'catalogSearch'` — a page-context guard that a
 * headless client hitting `/graphql` cold never satisfies (see
 * `Product.resolvers.ts`). The plain `products` collection's `keyword`
 * filter does full-text search with no such guard, so search reuses that
 * instead of needing another backend addition.
 */
export const SEARCH_QUERY = /* GraphQL */ `
  query Search($keyword: ID!, $page: ID) {
    products(
      filters: [
        { key: "keyword", operation: eq, value: $keyword }
        { key: "page", operation: eq, value: $page }
      ]
    ) {
      items {
        ${PRODUCT_CARD_FIELDS}
      }
      total
    }
  }
`;

export interface SearchResponse {
  products: { items: ProductCard[]; total: number };
}
