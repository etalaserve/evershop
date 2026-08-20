import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { getCurrentAdminUser } from '~/lib/admin/session.js';
import { gqlAdmin } from '~/lib/graphql/admin-client.js';
import { ROUTES_QUERY, type RoutesResponse } from '~/lib/graphql/queries/page-builder-admin.js';
import type { AppLoadContext } from '../../../bin/lib/createStorefrontMiddleware.js';

/**
 * `/admin/page-builder` redirects into the editor for the first route that
 * opts into page-builder editing (`"editable": true` in its `route.json`),
 * homepage preferred — same UX as the legacy `pageBuilder/index.ts`.
 *
 * Escapes the `admin.tsx` layout (`admin_.` flat-routes prefix, same trick
 * `admin_.login.tsx` uses) — the editor needs the full viewport, not
 * `admin.tsx`'s centered `max-w-6xl` content column — so the session guard
 * that layout would have provided is repeated here directly.
 */
export async function loader({ context, request }: LoaderFunctionArgs) {
  const user = await getCurrentAdminUser(context as AppLoadContext);
  if (!user) throw redirect('/admin/login');

  const cookie = request.headers.get('Cookie');
  const { routes } = await gqlAdmin<RoutesResponse>(ROUTES_QUERY, undefined, cookie);
  const editableRoutes = routes.filter((r) => !r.isApi && !r.isAdmin && r.editableInPageBuilder === true);
  const firstEditable = editableRoutes.find((r) => r.id === 'homepage') ?? editableRoutes[0];
  if (firstEditable) {
    throw redirect(`/admin/page-builder/edit/${encodeURIComponent(firstEditable.id)}`);
  }
  return { editableRoutes: [] };
}

export default function PageBuilderIndex() {
  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <style>{'header, footer { display: none !important; }'}</style>
      <h1 className="text-lg font-semibold">No editable routes</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add <code className="rounded bg-muted px-1 text-xs">&quot;editable&quot;: true</code> to a storefront
        route&apos;s <code className="text-xs">route.json</code> to make it appear here.
      </p>
    </div>
  );
}
