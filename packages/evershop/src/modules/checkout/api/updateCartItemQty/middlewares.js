import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateQty from './updateQty.js';

defineMiddlewares(
  { region: 'api', scope: 'updateCartItemQty', routeId: 'updateCartItemQty' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateQty', after: ['bodyParser'], before: ['apiResponse'], handler: updateQty }
  ]
);
