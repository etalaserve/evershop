import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getProductsBaseQuery } from '../../../../catalog/services/getProductsBaseQuery.js';

export default {
  Query: {
    productByUrlKey: async (_, { urlKey }: { urlKey: string }, { pool }) => {
      // `url_key` lives on `product_description` (joined by getProductsBaseQuery),
      // not `product` — see migration Version-1.0.0.js's PRODUCT_URL_KEY_UNIQUE.
      const query = getProductsBaseQuery();
      query.where('product_description.url_key', '=', urlKey).and('product.status', '=', 1);
      const result = await query.load(pool);
      return result ? camelCase(result) : null;
    }
  }
};
