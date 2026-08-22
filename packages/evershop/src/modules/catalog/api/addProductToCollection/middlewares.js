import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import addProducts from './addProducts.js';

defineMiddlewares(
  { region: 'api', scope: 'addProductToCollection', routeId: 'addProductToCollection' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'addProducts',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: addProducts
    }
  ]
);
