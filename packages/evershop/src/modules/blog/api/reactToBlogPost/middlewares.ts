import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import finish from './finish.js';
import reactToBlogPost from './reactToBlogPost.js';

defineMiddlewares(
  { region: 'api', scope: 'reactToBlogPost', routeId: 'reactToBlogPost' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'reactToBlogPost',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: reactToBlogPost
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
