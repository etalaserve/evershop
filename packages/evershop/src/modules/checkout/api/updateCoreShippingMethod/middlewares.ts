import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateCoreShippingMethod from './updateCoreShippingMethod.js';

defineMiddlewares(
  { region: 'api', scope: 'updateCoreShippingMethod', routeId: 'updateCoreShippingMethod' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateCoreShippingMethod', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateCoreShippingMethod }
  ]
);
