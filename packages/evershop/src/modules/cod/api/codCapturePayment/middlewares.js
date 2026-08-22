import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import capture from './capture.js';

/**
 * `capture`'s `before: ['apiResponse']` was an IMPLICIT default under the
 * old bracket convention (see `base/api/global/middlewares.ts`'s doc
 * comment) — made explicit here.
 */
defineMiddlewares(
  { region: 'api', scope: 'codCapturePayment', routeId: 'codCapturePayment' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'capture', after: ['bodyParser'], before: ['apiResponse'], handler: capture }
  ]
);
