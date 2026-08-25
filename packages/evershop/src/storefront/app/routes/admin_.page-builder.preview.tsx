import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import type { AppLoadContext } from '../../../bin/lib/createStorefrontMiddleware.js';
import { getCurrentAdminUser } from '~/lib/admin/session.js';
import { gql } from '~/lib/graphql/client.js';
import {
  WIDGETS_FOR_ROUTE_QUERY,
  type WidgetsForRouteResponse
} from '~/lib/graphql/queries/widgets.js';
import { resolveWidgetExtras } from '~/lib/widgets/resolveWidgetExtras.js';

/**
 * Preview snapshot for the page-builder canvas — the RR7 equivalent of the
 * legacy editor's `?ajax=true` eContext fetch (`pageBuilderEdit/Editor.tsx`'s
 * `pushPreviewToIframe`), which didn't survive the port.
 *
 * Returns everything the iframe needs to re-render a route's widget tree in
 * place: the overlayed widget list AND the server-resolved `extras` that go
 * with it. The admin fetches this after a mutation and posts it into the
 * canvas as a `data-update` message, instead of reloading the iframe
 * document (which cost a full SSR render plus re-executing the storefront's
 * whole module graph, ~1.6s, on every single edit).
 *
 * Deliberately a resource route under `/admin/page-builder/` rather than
 * `/api/`: that prefix is already in `MIGRATED_PATHS`
 * (createStorefrontMiddleware.ts), so it reaches RR7 with the admin session
 * attached — anything under `/api/` is claimed by the legacy Express
 * pipeline first.
 *
 * Resolving extras here rather than in the admin browser is what keeps this
 * cheap and correct: `resolveWidgetExtras` and the server `gql()` it calls
 * are server-only (absolute loopback URL), so a client-side version would
 * mean forking its 8-case switch and 8 query definitions into a parallel
 * client-safe module. One request returns both halves instead of 1 + N.
 *
 * Known degradation: `cart_frequently_bought_together` resolves against the
 * *storefront* session cookie (`sid`), which an `/admin/*` request doesn't
 * carry — that one widget previews with an empty cross-sell list. It already
 * fails soft (see resolveWidgetExtras' per-widget catch), so this is a
 * cosmetic preview gap, not an error path.
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getCurrentAdminUser(context as AppLoadContext);
  if (!user) throw redirect('/admin/login');

  const url = new URL(request.url);
  const route = url.searchParams.get('route');
  const changeset = url.searchParams.get('changeset');
  const entityUrn = url.searchParams.get('entityUrn') || null;

  if (!route) {
    return Response.json({ message: '`route` is required' }, { status: 400 });
  }

  const { widgetsForRoute } = await gql<WidgetsForRouteResponse>(
    WIDGETS_FOR_ROUTE_QUERY,
    { route, changeset, entityUrn }
  );
  const extras = await resolveWidgetExtras(
    widgetsForRoute,
    request.headers.get('Cookie')
  );

  return Response.json({ widgets: widgetsForRoute, extras });
}
