import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import savePaymentMethod from './savePaymentMethod.js';

defineMiddlewares(
  { region: 'api', scope: 'addCartPaymentMethod', routeId: 'addCartPaymentMethod' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'savePaymentMethod', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: savePaymentMethod }
  ]
);
