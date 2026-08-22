import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import placeOrder from './placeOrder.js';

defineMiddlewares(
  { region: 'api', scope: 'createOrder', routeId: 'createOrder' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'placeOrder', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: placeOrder }
  ]
);
