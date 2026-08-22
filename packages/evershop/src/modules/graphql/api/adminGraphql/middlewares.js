import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import graphql from './graphql.js';

defineMiddlewares(
  { region: 'api', scope: 'adminGraphql', routeId: 'adminGraphql' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'graphql', after: ['bodyParser'], before: ['apiResponse'], handler: graphql }
  ]
);
