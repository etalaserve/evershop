import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyJson from './bodyJson.js';
import webhook from './webhook.js';

/**
 * `bodyJson` was already plain (unbracketed) under the old convention, so
 * it got both implicit defaults: `after: ['escapeHtml', 'auth']`,
 * `before: ['apiResponse']`. `webhook` had explicit `after: ['bodyJson']`
 * from its bracket filename, but no explicit `before` — so it got the
 * implicit default `before: ['apiResponse']` too. Both made explicit here,
 * unchanged from actual current behavior.
 */
defineMiddlewares(
  { region: 'api', scope: 'stripeWebHook', routeId: 'stripeWebHook' },
  [
    { id: 'bodyJson', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: bodyJson },
    { id: 'webhook', after: ['bodyJson'], before: ['apiResponse'], handler: webhook }
  ]
);
