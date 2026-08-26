import { data, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { ProductGrid } from '~/components/catalog/product-grid.js';
import { WidgetArea } from '~/components/widgets/WidgetArea.js';
import { PuckArea } from '~/components/widgets/PuckArea.js';
import { loadPuckForRequest } from '~/lib/puck/engineSwitch.js';
import { CACHE_TTL, cached } from '~/lib/cache/middleware.js';
import { gql } from '~/lib/graphql/client.js';
import { CATEGORY_BY_URL_KEY_QUERY, type CategoryPageResponse } from '~/lib/graphql/queries/catalog.js';
import { WIDGETS_FOR_ROUTE_QUERY, type WidgetsForRouteResponse } from '~/lib/graphql/queries/widgets.js';
import { imageUrl } from '~/lib/image.js';
import { buildMeta, canonicalUrl } from '~/lib/seo.js';
import { resolveWidgetExtras } from '~/lib/widgets/resolveWidgetExtras.js';

// Matches `categoryView`'s legacy route id — this route is flagged
// `editable: true` there (see catalog/pages/frontStore/categoryView/route.json)
// and shows up in the page builder's route picker, but had no WidgetArea at
// all to actually place anything into.
const ROUTE_ID = 'categoryView';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const urlKey = params.urlKey!;
  const page = new URL(request.url).searchParams.get('page') ?? '1';
  const changeset = new URL(request.url).searchParams.get('changeset');
  const cookie = request.headers.get('Cookie');

  const [result, widgetData] = await Promise.all([
    cached(`page:category:${urlKey}:${page}`, CACHE_TTL.page, () =>
      gql<CategoryPageResponse>(CATEGORY_BY_URL_KEY_QUERY, { urlKey, page, limit: '24' })
    ),
    gql<WidgetsForRouteResponse>(WIDGETS_FOR_ROUTE_QUERY, { route: ROUTE_ID, changeset })
  ]);

  if (!result.categoryByUrlKey) {
    throw data('Category not found', { status: 404 });
  }

  const widgets = widgetData.widgetsForRoute;
  const extras = await resolveWidgetExtras(widgets, cookie);

  // TEMPORARY: `?__engine=puck` renders this route through Puck instead.

  const puck = await loadPuckForRequest(request, ROUTE_ID, {
    // Category and search share one listing context, so one pair of
    // components serves both. The route owns the wording; the components own
    // the presentation.
    listing: {
      title: result.categoryByUrlKey.name,
      subtitle: `${result.categoryByUrlKey.products.total} products`,
      products: result.categoryByUrlKey.products.items,
      total: result.categoryByUrlKey.products.total
    }
  });


  return { category: result.categoryByUrlKey, canonical: canonicalUrl(request), widgets, extras, puck };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [];
  const { category, canonical } = data;
  return buildMeta({
    title: category.metaTitle || category.name,
    description: category.metaDescription,
    canonical,
    image: category.image?.url ? imageUrl(category.image.url) : null
  });
};

export default function CategoryPage() {
  const { category, widgets, extras, puck } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{category.name}</h1>
        <p className="text-sm text-muted-foreground">{category.products.total} products</p>
      </div>
      <ProductGrid products={category.products.items} />
      {puck ? (
        <PuckArea data={puck.data} metadata={puck.metadata} />
      ) : (
        <WidgetArea areaId="content" widgets={widgets} extras={extras} />
      )}
    </div>
  );
}
