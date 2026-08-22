import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import markShipmentDelivered from './markShipmentDelivered.js';

defineMiddlewares(
  { region: 'api', scope: 'markShipmentDelivered', routeId: 'markShipmentDelivered' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'markShipmentDelivered', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: markShipmentDelivered }
  ]
);
