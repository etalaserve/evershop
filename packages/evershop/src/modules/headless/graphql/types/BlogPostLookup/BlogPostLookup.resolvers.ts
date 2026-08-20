import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getPostsBaseQuery } from '../../../../blog/services/getPostsBaseQuery.js';

export default {
  Query: {
    blogPostByUrlKey: async (_, { urlKey }: { urlKey: string }, { pool }) => {
      // url_key lives on blog_post_description (joined by getPostsBaseQuery).
      const query = getPostsBaseQuery();
      query.where('blog_post_description.url_key', '=', urlKey).and('blog_post.status', '=', 1);
      const result = await query.load(pool);
      return result ? camelCase(result) : null;
    }
  }
};
