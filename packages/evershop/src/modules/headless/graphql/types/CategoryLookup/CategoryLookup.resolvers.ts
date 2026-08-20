import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getCategoriesBaseQuery } from '../../../../catalog/services/getCategoriesBaseQuery.js';
import { getProductsByCategoryBaseQuery } from '../../../../catalog/services/getProductsByCategoryBaseQuery.js';
import { ProductCollection } from '../../../../catalog/services/ProductCollection.js';

export default {
  Query: {
    categoryByUrlKey: async (_, { urlKey }: { urlKey: string }, { pool }) => {
      // `url_key` lives on `category_description` (joined by getCategoriesBaseQuery),
      // not `category` — see migration Version-1.0.0.js's CATEGORY_URL_KEY_UNIQUE.
      const query = getCategoriesBaseQuery();
      query.where('category_description.url_key', '=', urlKey).and('category.status', '=', 1);
      const result = await query.load(pool);
      if (!result) {
        return null;
      }
      return {
        ...camelCase(result),
        // Mirrors `currentCategory`'s pattern (Category.resolvers.ts) — the
        // schema's `Category.products(filters:)` field needs its own
        // resolver here because this lookup doesn't go through the base
        // `getCategoriesBaseQuery` -> `Category.products` field resolver
        // path (that one assumes `category.category_id` is already camelCased
        // on the parent object, which it is, but re-deriving the base query
        // per category keeps this self-contained and matches the existing
        // pattern instead of relying on resolver field ordering).
        products: async (_ignored: unknown, { filters = [] }: { filters?: Array<{ key: string; operation: string; value: string }> }) => {
          const productsQuery = await getProductsByCategoryBaseQuery(result.category_id, false);
          const root = new ProductCollection(productsQuery);
          await root.init(filters, false);
          return root;
        }
      };
    }
  }
};
