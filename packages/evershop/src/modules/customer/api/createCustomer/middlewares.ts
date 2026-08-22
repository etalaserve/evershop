import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createCustomer from './createCustomer.js';

defineMiddlewares(
  { region: 'api', scope: 'createCustomer', routeId: 'createCustomer' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createCustomer', after: ['bodyParser'], before: ['apiResponse'], handler: createCustomer }
  ]
);
