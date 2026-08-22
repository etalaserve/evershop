import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createOrder from './createOrder.js';

defineMiddlewares(
  { region: 'api', scope: 'paypalCreateOrder', routeId: 'paypalCreateOrder' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createOrder', after: ['bodyParser'], before: ['apiResponse'], handler: createOrder }
  ]
);
