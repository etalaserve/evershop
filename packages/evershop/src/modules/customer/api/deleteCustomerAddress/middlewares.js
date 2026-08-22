import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import deleteCustomerAddress from './deleteCustomerAddress.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'api', scope: 'deleteCustomerAddress', routeId: 'deleteCustomerAddress' },
  [
    { id: 'deleteCustomerAddress', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: deleteCustomerAddress }
  ]
);
