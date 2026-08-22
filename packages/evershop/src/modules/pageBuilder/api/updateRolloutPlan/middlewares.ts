import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateRolloutPlan from './updateRolloutPlan.js';

defineMiddlewares(
  { region: 'api', scope: 'updateRolloutPlan', routeId: 'updateRolloutPlan' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateRolloutPlan', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateRolloutPlan }
  ]
);
