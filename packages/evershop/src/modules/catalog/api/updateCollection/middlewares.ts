import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateCollection from './updateCollection.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'updateCollection', routeId: 'updateCollection' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'updateCollection',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: updateCollection
    },
    { id: 'finish', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: finish }
  ]
);
