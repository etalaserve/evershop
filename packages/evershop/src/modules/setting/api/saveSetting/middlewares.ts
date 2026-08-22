import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import saveSetting from './saveSetting.js';

defineMiddlewares(
  { region: 'api', scope: 'saveSetting', routeId: 'saveSetting' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'saveSetting', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: saveSetting }
  ]
);
