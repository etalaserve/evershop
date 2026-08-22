import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createTaxRate from './createTaxRate.js';

/** Same pattern as createTaxClass — see that folder's middlewares.ts. */
defineMiddlewares(
  { region: 'api', scope: 'createTaxRate', routeId: 'createTaxRate' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createTaxRate', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createTaxRate }
  ]
);
