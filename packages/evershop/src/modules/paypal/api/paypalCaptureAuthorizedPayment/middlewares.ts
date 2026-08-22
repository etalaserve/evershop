import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import capture from './capture.js';

defineMiddlewares(
  { region: 'api', scope: 'paypalCaptureAuthorizedPayment', routeId: 'paypalCaptureAuthorizedPayment' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'capture', after: ['bodyParser'], before: ['apiResponse'], handler: capture }
  ]
);
