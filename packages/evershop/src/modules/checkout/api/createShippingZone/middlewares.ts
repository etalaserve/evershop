import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createShippingZone from './createShippingZone.js';

defineMiddlewares(
  { region: 'api', scope: 'createShippingZone', routeId: 'createShippingZone' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createShippingZone', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createShippingZone }
  ]
);
