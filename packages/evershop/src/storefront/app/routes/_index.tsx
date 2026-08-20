import { Link, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';

import { ProductGrid } from '~/components/catalog/product-grid.js';
import { WidgetArea } from '~/components/widgets/WidgetArea.js';
import { CACHE_TTL, cached } from '~/lib/cache/middleware.js';
import { gql } from '~/lib/graphql/client.js';
import { HOME_PAGE_QUERY, type HomePageResponse } from '~/lib/graphql/queries/catalog.js';
import { STORE_SETTINGS_QUERY, type StoreSettingsResponse } from '~/lib/graphql/queries/settings.js';
import { WIDGETS_FOR_ROUTE_QUERY, type WidgetsForRouteResponse } from '~/lib/graphql/queries/widgets.js';
import { imageUrl } from '~/lib/image.js';
import { buildMeta, canonicalUrl } from '~/lib/seo.js';
import { resolveWidgetExtras } from '~/lib/widgets/resolveWidgetExtras.js';

// Route id widgets are placed against via the admin page-builder's route
// picker — matches `widget_placement.route`, which mirrors EverShop's own
// route id for this page (the `pages/frontStore/homepage` directory name).
const ROUTE_ID = 'homepage';

export async function loader({ request }: LoaderFunctionArgs) {
  const changeset = new URL(request.url).searchParams.get('changeset');
  const cookie = request.headers.get('Cookie');
  const [data, settings, widgetData] = await Promise.all([
    cached('page:home', CACHE_TTL.page, () => gql<HomePageResponse>(HOME_PAGE_QUERY)),
    cached('fragment:settings', CACHE_TTL.fragment, () =>
      gql<StoreSettingsResponse>(STORE_SETTINGS_QUERY)
    ),
    gql<WidgetsForRouteResponse>(WIDGETS_FOR_ROUTE_QUERY, { route: ROUTE_ID, changeset })
  ]);
  const widgets = widgetData.widgetsForRoute;
  const extras = await resolveWidgetExtras(widgets, cookie);
  return {
    products: data.products.items,
    categories: data.categories.items,
    storeName: settings.setting.storeName,
    storeDescription: settings.setting.storeDescription,
    canonical: canonicalUrl(request),
    widgets,
    extras
  };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [];
  return buildMeta({
    title: data.storeName || 'Store',
    description: data.storeDescription,
    canonical: data.canonical
  });
};

export default function Home() {
  const { products, categories, widgets, extras } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <WidgetArea areaId="content" widgets={widgets} extras={extras} />
      {categories.length > 0 && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.categoryId}
              to={`/category/${category.urlKey}`}
              className="group relative overflow-hidden rounded-lg border border-border bg-muted"
            >
              <div className="aspect-video">
                {category.image ? (
                  <img
                    src={imageUrl(category.image.url)}
                    alt={category.image.alt ?? category.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-3">
                <span className="text-sm font-medium text-white">{category.name}</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">New arrivals</h2>
        <ProductGrid products={products} />
      </section>
    </div>
  );
}
