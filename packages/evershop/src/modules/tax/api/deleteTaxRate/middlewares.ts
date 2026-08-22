import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import deleteTaxRate from './deleteTaxRate.js';

/** Same pattern as createTaxClass — see that folder's middlewares.ts. */
defineMiddlewares(
  { region: 'api', scope: 'deleteTaxRate', routeId: 'deleteTaxRate' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'deleteTaxRate', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: deleteTaxRate }
  ]
);
