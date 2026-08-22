import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createNewCart from './createNewCart.js';

defineMiddlewares(
  { region: 'api', scope: 'createCart', routeId: 'createCart' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createNewCart', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createNewCart }
  ]
);
