import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import cancelOrder from './cancelOrder.js';

defineMiddlewares(
  { region: 'api', scope: 'cancelOrder', routeId: 'cancelOrder' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'cancelOrder', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: cancelOrder }
  ]
);
