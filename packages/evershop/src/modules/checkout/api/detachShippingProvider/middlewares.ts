import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import detachShippingProvider from './detachShippingProvider.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'api', scope: 'detachShippingProvider', routeId: 'detachShippingProvider' },
  [
    { id: 'detachShippingProvider', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: detachShippingProvider }
  ]
);
