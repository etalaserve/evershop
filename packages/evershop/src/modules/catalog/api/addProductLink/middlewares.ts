import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import addProductLink from './addProductLink.js';

defineMiddlewares(
  { region: 'api', scope: 'addProductLink', routeId: 'addProductLink' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'addProductLink',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: addProductLink
    }
  ]
);
