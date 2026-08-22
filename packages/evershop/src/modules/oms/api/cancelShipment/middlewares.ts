import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import cancelShipment from './cancelShipment.js';

defineMiddlewares(
  { region: 'api', scope: 'cancelShipment', routeId: 'cancelShipment' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'cancelShipment', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: cancelShipment }
  ]
);
