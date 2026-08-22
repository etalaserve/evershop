import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import authorize from './authorize.js';
import bodyParser from './bodyParser.js';

defineMiddlewares(
  { region: 'api', scope: 'paypalAuthorizePayment', routeId: 'paypalAuthorizePayment' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'authorize', after: ['bodyParser'], before: ['apiResponse'], handler: authorize }
  ]
);
