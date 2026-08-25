import { data } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import type { AppLoadContext } from '../../../bin/lib/createStorefrontMiddleware.js';
import { getCurrentAdminUser } from '~/lib/admin/session.js';
import { buildPuckConfig } from '~/lib/puck/buildPuckConfig.js';
import { resolvePuckExtras } from '~/lib/widgets/resolvePuckExtras.js';

/**
 * Resolve extras for a document the editor is holding but has not published.
 *
 * Resource route — action only, no default export, so nothing is rendered.
 *
 * The editor needs this because commerce widgets carry no data of their own:
 * a freshly dropped `collection_products` has a collection code in its props
 * and nothing else, so it renders empty until something resolves it. The
 * loader resolves extras for the document as loaded; this covers everything
 * added since.
 *
 * It must live under `/admin/page-builder/`, NOT `/api/`. `MIGRATED_PATHS`
 * routes `/admin/page-builder/*` to the RRv7 app with the admin session
 * intact, while anything under `/api/` is swallowed by the Express API
 * pipeline before RRv7 sees it.
 *
 * The document arrives in the request body rather than being read from the
 * database on purpose — the whole point is to resolve state that only exists
 * in the editor's memory.
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const user = await getCurrentAdminUser(context as AppLoadContext);
  if (!user) throw data('Unauthorized', { status: 401 });

  const body = (await request.json()) as {
    routeId?: string;
    data?: unknown;
  };
  if (!body?.data || typeof body.routeId !== 'string') {
    throw data('routeId and data are required', { status: 400 });
  }

  const extras = await resolvePuckExtras(body.data, buildPuckConfig(), {
    // The admin's own cookie, so `cart_frequently_bought_together` resolves
    // against a real cart rather than failing. It is the editor's cart, not a
    // shopper's — an accepted approximation of production in the canvas, and
    // the reason this response must never be cached.
    cookie: request.headers.get('Cookie')
  });

  return { extras };
}
