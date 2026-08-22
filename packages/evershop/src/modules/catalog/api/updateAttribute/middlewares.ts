import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateAttribute from './updateAttribute.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'updateAttribute', routeId: 'updateAttribute' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'updateAttribute',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: updateAttribute
    },
    { id: 'finish', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: finish }
  ]
);
