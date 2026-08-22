import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import deleteBlogComment from './deleteBlogComment.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'deleteBlogComment', routeId: 'deleteBlogComment' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'deleteBlogComment',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: deleteBlogComment
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
