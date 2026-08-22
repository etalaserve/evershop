import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateProduct from './updateProduct.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'updateProduct', routeId: 'updateProduct' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'updateProduct',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: updateProduct
    },
    { id: 'finish', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: finish }
  ]
);
