import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createCustomerAddress from './createCustomerAddress.js';

defineMiddlewares(
  { region: 'api', scope: 'createCustomerAddress', routeId: 'createCustomerAddress' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createCustomerAddress', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createCustomerAddress }
  ]
);
