import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import refundPaymentIntent from './refundPaymentIntent.js';

/** Same implicit-default pattern as capturePaymentIntent — see that folder's middlewares.ts. */
defineMiddlewares(
  { region: 'api', scope: 'refundPaymentIntent', routeId: 'refundPaymentIntent' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'refundPaymentIntent', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: refundPaymentIntent }
  ]
);
