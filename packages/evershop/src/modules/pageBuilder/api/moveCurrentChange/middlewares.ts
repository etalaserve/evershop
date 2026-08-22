import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import moveCurrentChange from './moveCurrentChange.js';

defineMiddlewares(
  { region: 'api', scope: 'moveCurrentChange', routeId: 'moveCurrentChange' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'moveCurrentChange', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: moveCurrentChange }
  ]
);
