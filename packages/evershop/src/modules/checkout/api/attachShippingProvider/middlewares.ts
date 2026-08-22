import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import attachShippingProvider from './attachShippingProvider.js';

defineMiddlewares(
  { region: 'api', scope: 'attachShippingProvider', routeId: 'attachShippingProvider' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'attachShippingProvider', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: attachShippingProvider }
  ]
);
