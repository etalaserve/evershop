import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateProductLink from './updateProductLink.js';

defineMiddlewares(
  { region: 'api', scope: 'updateProductLink', routeId: 'updateProductLink' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'updateProductLink',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: updateProductLink
    }
  ]
);
