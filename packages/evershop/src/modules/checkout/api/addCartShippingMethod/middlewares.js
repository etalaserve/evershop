import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import saveShippingMethod from './saveShippingMethod.js';

defineMiddlewares(
  { region: 'api', scope: 'addCartShippingMethod', routeId: 'addCartShippingMethod' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'saveShippingMethod', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: saveShippingMethod }
  ]
);
