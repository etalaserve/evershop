import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import removeCoupon from './removeCoupon.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'api', scope: 'couponRemove', routeId: 'couponRemove' },
  [
    { id: 'removeCoupon', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: removeCoupon }
  ]
);
