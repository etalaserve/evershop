import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateOrderMetafields from './updateOrderMetafields.js';

defineMiddlewares(
  { region: 'api', scope: 'updateOrderMetafields', routeId: 'updateOrderMetafields' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateOrderMetafields', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateOrderMetafields }
  ]
);
