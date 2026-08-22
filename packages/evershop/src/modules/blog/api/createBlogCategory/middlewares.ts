import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createBlogCategory from './createBlogCategory.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'createBlogCategory', routeId: 'createBlogCategory' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'createBlogCategory',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: createBlogCategory
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
