import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import saveAddress from './saveAddress.js';

defineMiddlewares(
  { region: 'api', scope: 'addCartAddress', routeId: 'addCartAddress' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'saveAddress', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: saveAddress }
  ]
);
