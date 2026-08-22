import { defineMiddlewares } from '../../../../../lib/middleware/registry.js';
import logout from './logout.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'customerLogoutJson' },
  [
    { id: 'logout', after: ['auth'], before: ['notFound'], handler: logout }
  ]
);
