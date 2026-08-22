import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateCategory from './updateCategory.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'updateCategory', routeId: 'updateCategory' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'updateCategory',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: updateCategory
    },
    { id: 'finish', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: finish }
  ]
);
