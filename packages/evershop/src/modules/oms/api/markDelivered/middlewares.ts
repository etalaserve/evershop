import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import markDelivered from './markDelivered.js';

defineMiddlewares(
  { region: 'api', scope: 'markDelivered', routeId: 'markDelivered' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'markDelivered', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: markDelivered }
  ]
);
