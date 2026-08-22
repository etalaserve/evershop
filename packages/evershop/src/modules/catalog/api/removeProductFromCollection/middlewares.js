import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import removeProducts from './removeProducts.js';

defineMiddlewares(
  { region: 'api', scope: 'removeProductFromCollection', routeId: 'removeProductFromCollection' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'removeProducts',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: removeProducts
    }
  ]
);
