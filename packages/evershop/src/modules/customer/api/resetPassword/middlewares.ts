import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import resetPassword from './resetPassword.js';

defineMiddlewares(
  { region: 'api', scope: 'resetPassword', routeId: 'resetPassword' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'resetPassword', after: ['bodyParser'], before: ['apiResponse'], handler: resetPassword }
  ]
);
