import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import finish from './finish.js';
import updateBlogCategory from './updateBlogCategory.js';

defineMiddlewares(
  { region: 'api', scope: 'updateBlogCategory', routeId: 'updateBlogCategory' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'updateBlogCategory',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: updateBlogCategory
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
