import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import capturePaymentIntent from './capturePaymentIntent.js';

/**
 * `capturePaymentIntent`'s file was already plain (unbracketed) under the
 * old convention, meaning it got BOTH implicit defaults:
 * `after: ['escapeHtml', 'auth']` and `before: ['apiResponse']` — made
 * explicit here. It doesn't need an explicit dependency on `bodyParser`:
 * `bodyParser` already forces itself before `auth`, so `capturePaymentIntent`
 * (after `auth`) transitively runs after it.
 */
defineMiddlewares(
  { region: 'api', scope: 'capturePaymentIntent', routeId: 'capturePaymentIntent' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'capturePaymentIntent', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: capturePaymentIntent }
  ]
);
