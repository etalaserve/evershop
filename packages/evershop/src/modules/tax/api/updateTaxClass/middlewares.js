import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateTaxClass from './updateTaxClass.js';

/** Same pattern as createTaxClass — see that folder's middlewares.ts. */
defineMiddlewares(
  { region: 'api', scope: 'updateTaxClass', routeId: 'updateTaxClass' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateTaxClass', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateTaxClass }
  ]
);
