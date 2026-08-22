import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createCoreShippingRate from './createCoreShippingRate.js';

defineMiddlewares(
  { region: 'api', scope: 'createCoreShippingRate', routeId: 'createCoreShippingRate' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createCoreShippingRate', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createCoreShippingRate }
  ]
);
