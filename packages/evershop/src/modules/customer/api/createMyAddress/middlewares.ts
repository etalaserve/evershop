import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createMyAddress from './createMyAddress.js';

defineMiddlewares(
  { region: 'api', scope: 'createMyAddress', routeId: 'createMyAddress' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createMyAddress', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createMyAddress }
  ]
);
