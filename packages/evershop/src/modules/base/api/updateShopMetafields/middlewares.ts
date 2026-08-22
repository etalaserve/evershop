import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateShopMetafields from './updateShopMetafields.js';

defineMiddlewares(
  { region: 'api', scope: 'updateShopMetafields', routeId: 'updateShopMetafields' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateShopMetafields', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateShopMetafields }
  ]
);
