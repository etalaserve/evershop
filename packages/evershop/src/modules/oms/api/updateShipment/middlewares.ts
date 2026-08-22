import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateShipment from './updateShipment.js';

defineMiddlewares(
  { region: 'api', scope: 'updateShipment', routeId: 'updateShipment' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateShipment', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateShipment }
  ]
);
