import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import deleteCustomer from './deleteCustomer.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'api', scope: 'deleteCustomer', routeId: 'deleteCustomer' },
  [
    { id: 'deleteCustomer', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: deleteCustomer }
  ]
);
