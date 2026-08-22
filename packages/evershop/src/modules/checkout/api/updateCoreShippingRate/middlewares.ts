import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateCoreShippingRate from './updateCoreShippingRate.js';

defineMiddlewares(
  { region: 'api', scope: 'updateCoreShippingRate', routeId: 'updateCoreShippingRate' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateCoreShippingRate', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateCoreShippingRate }
  ]
);
