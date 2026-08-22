import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import saveGroup from './saveGroup.js';

defineMiddlewares(
  { region: 'api', scope: 'createVariantGroup', routeId: 'createVariantGroup' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'saveGroup', after: ['bodyParser'], before: ['apiResponse'], handler: saveGroup }
  ]
);
