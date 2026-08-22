import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import finish from './finish.js';
import submitBlogComment from './submitBlogComment.js';

defineMiddlewares(
  { region: 'api', scope: 'submitBlogComment', routeId: 'submitBlogComment' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'submitBlogComment',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: submitBlogComment
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
