import { data, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';

import { RichContent } from '~/components/content/rich-content.js';
import { CACHE_TTL, cached } from '~/lib/cache/middleware.js';
import { gql } from '~/lib/graphql/client.js';
import { CMS_PAGE_QUERY, type CmsPageResponse } from '~/lib/graphql/queries/cms.js';
import { buildMeta, canonicalUrl } from '~/lib/seo.js';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const urlKey = params.urlKey!;
  const result = await cached(`data:cms-page:${urlKey}`, CACHE_TTL.data, () =>
    gql<CmsPageResponse>(CMS_PAGE_QUERY, { urlKey })
  );
  if (!result.cmsPageByUrlKey) {
    throw data('Page not found', { status: 404 });
  }
  return { page: result.cmsPageByUrlKey, canonical: canonicalUrl(request) };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [];
  const { page, canonical } = data;
  return buildMeta({ title: page.metaTitle || page.name, description: page.metaDescription, canonical });
};

export default function CmsPage() {
  const { page } = useLoaderData<typeof loader>();

  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">{page.name}</h1>
      <RichContent rows={page.content as any} />
    </article>
  );
}
