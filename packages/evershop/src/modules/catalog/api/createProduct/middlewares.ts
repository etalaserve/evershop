import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createProduct from './createProduct.js';
import duplicateData from './duplicateData.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'createProduct', routeId: 'createProduct' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'createProduct',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: createProduct
    },
    {
      id: 'duplicateData',
      after: ['createProduct'],
      before: ['finish'],
      handler: duplicateData
    },
    { id: 'finish', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: finish }
  ]
);
