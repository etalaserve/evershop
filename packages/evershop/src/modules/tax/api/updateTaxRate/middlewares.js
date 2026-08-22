import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateTaxRate from './updateTaxRate.js';

/** Same pattern as createTaxClass — see that folder's middlewares.ts. */
defineMiddlewares(
  { region: 'api', scope: 'updateTaxRate', routeId: 'updateTaxRate' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateTaxRate', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateTaxRate }
  ]
);
