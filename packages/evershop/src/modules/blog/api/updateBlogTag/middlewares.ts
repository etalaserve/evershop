import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import finish from './finish.js';
import updateBlogTag from './updateBlogTag.js';

defineMiddlewares(
  { region: 'api', scope: 'updateBlogTag', routeId: 'updateBlogTag' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'updateBlogTag',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: updateBlogTag
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
