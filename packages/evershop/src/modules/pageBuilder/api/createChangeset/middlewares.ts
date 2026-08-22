import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createChangeset from './createChangeset.js';

defineMiddlewares(
  { region: 'api', scope: 'createChangeset', routeId: 'createChangeset' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createChangeset', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createChangeset }
  ]
);
