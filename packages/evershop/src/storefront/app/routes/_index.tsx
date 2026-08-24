import { useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { WidgetArea } from '~/components/widgets/WidgetArea.js';
import { CACHE_TTL, cached } from '~/lib/cache/middleware.js';
import { gql } from '~/lib/graphql/client.js';
import { STORE_SETTINGS_QUERY, type StoreSettingsResponse } from '~/lib/graphql/queries/settings.js';
import { WIDGETS_FOR_ROUTE_QUERY, type WidgetsForRouteResponse } from '~/lib/graphql/queries/widgets.js';
import { buildMeta, canonicalUrl } from '~/lib/seo.js';
import { resolveWidgetExtras } from '~/lib/widgets/resolveWidgetExtras.js';

// Route id widgets are placed against via the admin page-builder's route
// picker — matches `widget_placement.route`, which mirrors EverShop's own
// route id for this page (the `pages/frontStore/homepage` directory name).
const ROUTE_ID = 'homepage';

export async function loader({ request }: LoaderFunctionArgs) {
  const changeset = new URL(request.url).searchParams.get('changeset');
  const cookie = request.headers.get('Cookie');
  const [settings, widgetData] = await Promise.all([
    cached('fragment:settings', CACHE_TTL.fragment, () =>
      gql<StoreSettingsResponse>(STORE_SETTINGS_QUERY)
    ),
    gql<WidgetsForRouteResponse>(WIDGETS_FOR_ROUTE_QUERY, { route: ROUTE_ID, changeset })
  ]);
  const widgets = widgetData.widgetsForRoute;
  const extras = await resolveWidgetExtras(widgets, cookie);
  return {
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
  const { widgets, extras } = useLoaderData<typeof loader>();

  // The category grid and "New arrivals" product grid used to be hardcoded
  // here — now `top_categories`/`latest_products` widgets, seeded onto this
  // route by `pageBuilder`'s Version-1.3.0 migration so a fresh install's
  // homepage still shows them by default, same as before. Everything below
  // the header is now editable/removable through the page builder.
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <WidgetArea areaId="content" widgets={widgets} extras={extras} />
    </div>
  );
}
