import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateShippingZone from './updateShippingZone.js';

defineMiddlewares(
  { region: 'api', scope: 'updateShippingZone', routeId: 'updateShippingZone' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateShippingZone', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateShippingZone }
  ]
);
