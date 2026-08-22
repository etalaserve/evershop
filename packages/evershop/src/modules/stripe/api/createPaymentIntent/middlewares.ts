import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createPaymentIntent from './createPaymentIntent.js';

/** Same implicit-default pattern as capturePaymentIntent — see that folder's middlewares.ts. */
defineMiddlewares(
  { region: 'api', scope: 'createPaymentIntent', routeId: 'createPaymentIntent' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createPaymentIntent', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createPaymentIntent }
  ]
);
