import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createCollection from './createCollection.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'createCollection', routeId: 'createCollection' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'createCollection',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: createCollection
    },
    { id: 'finish', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: finish }
  ]
);
