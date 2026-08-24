import { data, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { RichContent } from '~/components/content/rich-content.js';
import { WidgetArea } from '~/components/widgets/WidgetArea.js';
import { CACHE_TTL, cached } from '~/lib/cache/middleware.js';
import { gql } from '~/lib/graphql/client.js';
import { CMS_PAGE_QUERY, type CmsPageResponse } from '~/lib/graphql/queries/cms.js';
import { WIDGETS_FOR_ROUTE_QUERY, type WidgetsForRouteResponse } from '~/lib/graphql/queries/widgets.js';
import { buildMeta, canonicalUrl } from '~/lib/seo.js';
import { resolveWidgetExtras } from '~/lib/widgets/resolveWidgetExtras.js';

// Matches `cmsPageView`'s legacy route id (`editable: true`) — route-level,
// same convention as every other route here. The page's own rich-text
// `content` (authored via the CMS admin) stays the primary content; this
// area is for supplementary blocks (a promo banner, related links, ...)
// merchants can add without touching the CMS body.
const ROUTE_ID = 'cmsPageView';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const urlKey = params.urlKey!;
  const changeset = new URL(request.url).searchParams.get('changeset');
  const cookie = request.headers.get('Cookie');

  const [result, widgetData] = await Promise.all([
    cached(`data:cms-page:${urlKey}`, CACHE_TTL.data, () => gql<CmsPageResponse>(CMS_PAGE_QUERY, { urlKey })),
    gql<WidgetsForRouteResponse>(WIDGETS_FOR_ROUTE_QUERY, { route: ROUTE_ID, changeset })
  ]);
  if (!result.cmsPageByUrlKey) {
    throw data('Page not found', { status: 404 });
  }

  const widgets = widgetData.widgetsForRoute;
  const extras = await resolveWidgetExtras(widgets, cookie);

  return { page: result.cmsPageByUrlKey, canonical: canonicalUrl(request), widgets, extras };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [];
  const { page, canonical } = data;
  return buildMeta({ title: page.metaTitle || page.name, description: page.metaDescription, canonical });
};

export default function CmsPage() {
  const { page, widgets, extras } = useLoaderData<typeof loader>();

  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">{page.name}</h1>
      <RichContent rows={page.content as any} />
      <WidgetArea areaId="content" widgets={widgets} extras={extras} />
    </article>
  );
}
