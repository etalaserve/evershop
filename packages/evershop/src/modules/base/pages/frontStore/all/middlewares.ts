import { defineMiddlewares } from '../../../../../lib/middleware/registry.js';
import redirect from './redirect.js';
import serveSitemap from './serveSitemap.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'frontStore' },
  [
    { id: 'redirect', after: ['auth'], before: ['notFound'], handler: redirect },
    { id: 'serveSitemap', after: ['auth'], before: ['notFound'], handler: serveSitemap }
  ]
);
