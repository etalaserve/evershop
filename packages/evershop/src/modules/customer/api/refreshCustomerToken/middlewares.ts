import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import refreshToken from './refreshToken.js';

defineMiddlewares(
  { region: 'api', scope: 'refreshCustomerToken', routeId: 'refreshCustomerToken' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'refreshToken', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: refreshToken }
  ]
);
