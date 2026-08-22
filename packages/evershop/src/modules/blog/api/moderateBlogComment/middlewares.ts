import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import finish from './finish.js';
import moderateBlogComment from './moderateBlogComment.js';

defineMiddlewares(
  { region: 'api', scope: 'moderateBlogComment', routeId: 'moderateBlogComment' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'moderateBlogComment',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: moderateBlogComment
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
