import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getCmsPagesBaseQuery } from '../../../../cms/services/getCmsPagesBaseQuery.js';

export default {
  Query: {
    cmsPageByUrlKey: async (_, { urlKey }: { urlKey: string }, { pool }) => {
      // url_key lives on cms_page_description (joined by getCmsPagesBaseQuery).
      const query = getCmsPagesBaseQuery();
      // cms_page.status is a boolean column (unlike blog_post's smallint), so it's
      // compared against `true`, not `1` — Postgres doesn't implicitly cast int->bool.
      query.where('cms_page_description.url_key', '=', urlKey).and('cms_page.status', '=', true);
      const result = await query.load(pool);
      return result ? camelCase(result) : null;
    }
  }
};
