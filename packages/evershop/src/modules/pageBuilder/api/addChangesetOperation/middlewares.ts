import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import addChangesetOperation from './addChangesetOperation.js';
import bodyParser from './bodyParser.js';

defineMiddlewares(
  { region: 'api', scope: 'addChangesetOperation', routeId: 'addChangesetOperation' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'addChangesetOperation', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: addChangesetOperation }
  ]
);
