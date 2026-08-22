import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createCoreShippingMethod from './createCoreShippingMethod.js';

defineMiddlewares(
  { region: 'api', scope: 'createCoreShippingMethod', routeId: 'createCoreShippingMethod' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createCoreShippingMethod', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createCoreShippingMethod }
  ]
);
