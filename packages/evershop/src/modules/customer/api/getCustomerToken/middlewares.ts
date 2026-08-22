import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import generateToken from './generateToken.js';

defineMiddlewares(
  { region: 'api', scope: 'getCustomerToken', routeId: 'getCustomerToken' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'generateToken', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: generateToken }
  ]
);
