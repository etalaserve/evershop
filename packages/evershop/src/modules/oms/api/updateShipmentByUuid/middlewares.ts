import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateShipmentByUuid from './updateShipmentByUuid.js';

defineMiddlewares(
  { region: 'api', scope: 'updateShipmentByUuid', routeId: 'updateShipmentByUuid' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateShipmentByUuid', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateShipmentByUuid }
  ]
);
