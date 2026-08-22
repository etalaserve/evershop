import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateMyAddress from './updateMyAddress.js';

defineMiddlewares(
  { region: 'api', scope: 'updateMyAddress', routeId: 'updateMyAddress' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateMyAddress', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateMyAddress }
  ]
);
