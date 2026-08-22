import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createBlogTag from './createBlogTag.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'createBlogTag', routeId: 'createBlogTag' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'createBlogTag',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: createBlogTag
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
