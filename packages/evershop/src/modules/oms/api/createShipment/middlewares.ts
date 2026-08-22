import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createShipment from './createShipment.js';

defineMiddlewares(
  { region: 'api', scope: 'createShipment', routeId: 'createShipment' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createShipment', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createShipment }
  ]
);
