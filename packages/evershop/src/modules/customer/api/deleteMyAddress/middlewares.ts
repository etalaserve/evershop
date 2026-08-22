import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import deleteMyAddress from './deleteMyAddress.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'api', scope: 'deleteMyAddress', routeId: 'deleteMyAddress' },
  [
    { id: 'deleteMyAddress', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: deleteMyAddress }
  ]
);
