import { useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { ProductGrid } from '~/components/catalog/product-grid.js';
import { WidgetArea } from '~/components/widgets/WidgetArea.js';
import { PuckArea } from '~/components/widgets/PuckArea.js';
import { loadPuckForRequest } from '~/lib/puck/engineSwitch.js';
import { gql } from '~/lib/graphql/client.js';
import { SEARCH_QUERY, type SearchResponse } from '~/lib/graphql/queries/catalog.js';
import { WIDGETS_FOR_ROUTE_QUERY, type WidgetsForRouteResponse } from '~/lib/graphql/queries/widgets.js';
import { buildMeta } from '~/lib/seo.js';
import { resolveWidgetExtras } from '~/lib/widgets/resolveWidgetExtras.js';

// Matches `catalogSearch`'s legacy route id (`editable: true`).
const ROUTE_ID = 'catalogSearch';

// Query-driven, thin/duplicate content — never indexed.
export const meta: MetaFunction = () => buildMeta({ title: 'Search', noindex: true });

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('q') ?? '';
  const page = url.searchParams.get('page') ?? '1';
  const changeset = url.searchParams.get('changeset');
  const cookie = request.headers.get('Cookie');

  const widgetData = await gql<WidgetsForRouteResponse>(WIDGETS_FOR_ROUTE_QUERY, { route: ROUTE_ID, changeset });
  const widgets = widgetData.widgetsForRoute;
  const extras = await resolveWidgetExtras(widgets, cookie);

  if (!keyword) {
    // TEMPORARY: `?__engine=puck` renders this route through Puck instead.
    const puck = await loadPuckForRequest(request, ROUTE_ID, {
      listing: { title: 'Search', subtitle: null, products: [], total: 0 }
    });

    return { keyword, products: [], total: 0, widgets, extras, puck };
  }

  // Search results are per-query and change with the catalog — no cache,
  // unlike the catalog/home pages (CACHE_TTL.page would go stale as soon as
  // a product's stock/price changes and a shopper searched a common term).
  const result = await gql<SearchResponse>(SEARCH_QUERY, { keyword, page });

  // This branch previously returned no `puck` at all, so `?__engine=puck`
  // silently fell back to the widget pipeline for every actual search — the
  // one case the route exists to serve.
  const puck = await loadPuckForRequest(request, ROUTE_ID, {
    listing: {
      title: `Results for "${keyword}"`,
      subtitle: `${result.products.total} products`,
      products: result.products.items,
      total: result.products.total
    }
  });

  return {
    keyword,
    products: result.products.items,
    total: result.products.total,
    widgets,
    extras,
    puck
  };
}

export default function SearchPage() {
  const { keyword, products, total, widgets, extras, puck } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {keyword ? `Results for "${keyword}"` : 'Search'}
        </h1>
        {keyword && <p className="text-sm text-muted-foreground">{total} products</p>}
      </div>
      <ProductGrid products={products} />
      {puck ? (
        <PuckArea data={puck.data} metadata={puck.metadata} />
      ) : (
        <WidgetArea areaId="content" widgets={widgets} extras={extras} />
      )}
    </div>
  );
}
