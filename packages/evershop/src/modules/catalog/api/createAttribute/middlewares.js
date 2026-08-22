import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createAttribute from './createAttribute.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'createAttribute', routeId: 'createAttribute' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'createAttribute',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: createAttribute
    },
    { id: 'finish', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: finish }
  ]
);
