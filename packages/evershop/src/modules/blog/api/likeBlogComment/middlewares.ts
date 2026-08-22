import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import finish from './finish.js';
import likeBlogComment from './likeBlogComment.js';

defineMiddlewares(
  { region: 'api', scope: 'likeBlogComment', routeId: 'likeBlogComment' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'likeBlogComment',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: likeBlogComment
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
