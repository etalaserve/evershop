import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createCategory from './createCategory.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'createCategory', routeId: 'createCategory' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'createCategory',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: createCategory
    },
    { id: 'finish', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: finish }
  ]
);
