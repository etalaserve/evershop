import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateShippingZoneProvider from './updateShippingZoneProvider.js';

defineMiddlewares(
  { region: 'api', scope: 'updateShippingZoneProvider', routeId: 'updateShippingZoneProvider' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateShippingZoneProvider', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateShippingZoneProvider }
  ]
);
