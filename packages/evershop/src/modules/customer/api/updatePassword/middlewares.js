import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updatePassword from './updatePassword.js';

defineMiddlewares(
  { region: 'api', scope: 'updatePassword', routeId: 'updatePassword' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updatePassword', after: ['bodyParser'], before: ['apiResponse'], handler: updatePassword }
  ]
);
