import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateCustomerMetafields from './updateCustomerMetafields.js';

defineMiddlewares(
  { region: 'api', scope: 'updateCustomerMetafields', routeId: 'updateCustomerMetafields' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateCustomerMetafields', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateCustomerMetafields }
  ]
);
