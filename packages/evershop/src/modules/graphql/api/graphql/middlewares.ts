import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import graphql from './graphql.js';
import removeUser from './removeUser.js';

/**
 * `removeUser` clears the admin `user` context for this public/customer
 * endpoint — order was `after: ['auth'], before: ['graphql']` under the
 * bracket convention, preserved as-is.
 */
defineMiddlewares(
  { region: 'api', scope: 'graphql', routeId: 'graphql' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'removeUser', after: ['auth'], before: ['graphql'], handler: removeUser },
    { id: 'graphql', after: ['bodyParser'], before: ['apiResponse'], handler: graphql }
  ]
);
