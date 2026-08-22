import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateQty from './updateQty.js';

defineMiddlewares(
  { region: 'api', scope: 'updateMineCartItemQty', routeId: 'updateMineCartItemQty' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateQty', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateQty }
  ]
);
