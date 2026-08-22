import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createRolloutPlan from './createRolloutPlan.js';

defineMiddlewares(
  { region: 'api', scope: 'createRolloutPlan', routeId: 'createRolloutPlan' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createRolloutPlan', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createRolloutPlan }
  ]
);
