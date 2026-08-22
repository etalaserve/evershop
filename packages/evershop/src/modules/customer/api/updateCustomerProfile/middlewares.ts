import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateProfile from './updateProfile.js';

defineMiddlewares(
  { region: 'api', scope: 'updateCustomerProfile', routeId: 'updateCustomerProfile' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateProfile', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateProfile }
  ]
);
