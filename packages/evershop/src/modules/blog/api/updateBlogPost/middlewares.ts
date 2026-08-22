import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import finish from './finish.js';
import updateBlogPost from './updateBlogPost.js';

defineMiddlewares(
  { region: 'api', scope: 'updateBlogPost', routeId: 'updateBlogPost' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'updateBlogPost',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: updateBlogPost
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
