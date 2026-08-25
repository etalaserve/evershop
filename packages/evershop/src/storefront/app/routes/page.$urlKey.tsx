import { data, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { RichContent } from '~/components/content/rich-content.js';
import { PuckArea } from '~/components/widgets/PuckArea.js';
import { WidgetArea } from '~/components/widgets/WidgetArea.js';
import { CACHE_TTL, cached } from '~/lib/cache/middleware.js';
import { gql } from '~/lib/graphql/client.js';
import { CMS_PAGE_QUERY, type CmsPageResponse } from '~/lib/graphql/queries/cms.js';
import { WIDGETS_FOR_ROUTE_QUERY, type WidgetsForRouteResponse } from '~/lib/graphql/queries/widgets.js';
import { buildMeta, canonicalUrl } from '~/lib/seo.js';
import { loadPuckDocument } from '~/lib/puck/loadPuckDocument.js';
import { resolveWidgetExtras } from '~/lib/widgets/resolveWidgetExtras.js';

// Matches `cmsPageView`'s legacy route id (`editable: true`) — route-level,
// same convention as every other route here. The page's own rich-text
// `content` (authored via the CMS admin) stays the primary content; this
// area is for supplementary blocks (a promo banner, related links, ...)
// merchants can add without touching the CMS body.
const ROUTE_ID = 'cmsPageView';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const urlKey = params.urlKey!;
  const url = new URL(request.url);
  const changeset = url.searchParams.get('changeset');
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

  /**
   * TEMPORARY Puck-migration scaffolding — remove at cutover.
   *
   * `?__engine=puck` renders this route's widget area from `puck_document`
   * instead of the widget tables, so the byte-diff harness
   * (`tests/e2e/pageBuilder/specs/00-migration/puck-byte-diff.spec.ts`) can
   * fetch the SAME page through both pipelines and compare the HTML.
   *
   * Opt-in per request and never the default, so ordinary traffic is
   * untouched; it also degrades to the widget pipeline when no document has
   * been backfilled for the route, rather than rendering a blank page.
   *
   * This is the one route Phase 2 renders through Puck: a CMS page is pure
   * content with no commerce extras, which isolates the config generator and
   * the converter from the data-resolution work that comes in Phase 3.
   */
  const puckDocument =
    url.searchParams.get('__engine') === 'puck'
      ? await loadPuckDocument(ROUTE_ID)
      : null;

  return {
    page: result.cmsPageByUrlKey,
    canonical: canonicalUrl(request),
    widgets,
    extras,
    puckDocument
  };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [];
  const { page, canonical } = data;
  return buildMeta({ title: page.metaTitle || page.name, description: page.metaDescription, canonical });
};

export default function CmsPage() {
  const { page, widgets, extras, puckDocument } = useLoaderData<typeof loader>();

  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">{page.name}</h1>
      <RichContent rows={page.content as any} />
      {/* See the loader: `?__engine=puck` is temporary migration scaffolding.
          Falls back to the widget pipeline when no document exists. */}
      {puckDocument ? (
        <PuckArea data={puckDocument} extras={extras} />
      ) : (
        <WidgetArea areaId="content" widgets={widgets} extras={extras} />
      )}
    </article>
  );
}
