import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateCustomerAddress from './updateCustomerAddress.js';

defineMiddlewares(
  { region: 'api', scope: 'updateCustomerAddress', routeId: 'updateCustomerAddress' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateCustomerAddress', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateCustomerAddress }
  ]
);
