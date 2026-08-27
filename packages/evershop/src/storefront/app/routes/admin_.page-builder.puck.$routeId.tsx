import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

/**
 * Redirect for the Puck editor's build-time URL.
 *
 * `/admin/page-builder/puck/:routeId` was where the Puck editor lived while it
 * was built alongside the widget-table one. It is now the editor, served from
 * the canonical `/admin/page-builder/edit/:routeId`, so this only keeps links
 * made during that period working.
 *
 * The query string is carried across: `?session=` (rollout editing) and
 * `?entity=` (landing-page scope) both change what the editor opens, and
 * dropping them would silently open the wrong document.
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const { search } = new URL(request.url);
  throw redirect(
    `/admin/page-builder/edit/${encodeURIComponent(params.routeId!)}${search}`
  );
}
