import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import checkout from './checkout.js';

defineMiddlewares(
  { region: 'api', scope: 'cartCheckout', routeId: 'cartCheckout' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'checkout', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: checkout }
  ]
);
