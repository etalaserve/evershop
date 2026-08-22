import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateCustomer from './updateCustomer.js';

defineMiddlewares(
  { region: 'api', scope: 'updateCustomer', routeId: 'updateCustomer' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateCustomer', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateCustomer }
  ]
);
