import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import addItemToCart from './addItemToCart.js';

defineMiddlewares(
  { region: 'api', scope: 'addCartItem', routeId: 'addCartItem' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'addItemToCart', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: addItemToCart }
  ]
);
