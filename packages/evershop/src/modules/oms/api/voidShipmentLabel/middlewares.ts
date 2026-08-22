import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import voidShipmentLabel from './voidShipmentLabel.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'api', scope: 'voidShipmentLabel', routeId: 'voidShipmentLabel' },
  [
    { id: 'voidShipmentLabel', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: voidShipmentLabel }
  ]
);
