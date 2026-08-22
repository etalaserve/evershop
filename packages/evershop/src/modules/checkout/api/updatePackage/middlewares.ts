import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updatePackage from './updatePackage.js';

defineMiddlewares(
  { region: 'api', scope: 'updatePackage', routeId: 'updatePackage' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updatePackage', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updatePackage }
  ]
);
