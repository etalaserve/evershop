import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createBlogPost from './createBlogPost.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'createBlogPost', routeId: 'createBlogPost' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'createBlogPost',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: createBlogPost
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
