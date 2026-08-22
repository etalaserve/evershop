import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createPackage from './createPackage.js';

defineMiddlewares(
  { region: 'api', scope: 'createPackage', routeId: 'createPackage' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createPackage', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createPackage }
  ]
);
