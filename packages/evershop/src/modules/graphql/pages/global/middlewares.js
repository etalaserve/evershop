import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import buildQuery from './buildQuery.js';
import graphql from './graphql.js';

/**
 * Every page-render request builds and executes an internal GraphQL query
 * for that page's widgets/data (this is NOT the public /api/graphql
 * endpoint — that's graphql/api/graphql). `buildQuery`'s `after: ['bodyParser', 'notFound']`
 * is preserved as-is from the bracket filename.
 */
defineMiddlewares(
  { region: 'pages', scope: 'app', routeId: null },
  [
    { id: 'bodyParser', after: ['auth'], before: ['buildQuery'], handler: bodyParser },
    { id: 'buildQuery', after: ['bodyParser', 'notFound'], before: ['graphql'], handler: buildQuery },
    { id: 'graphql', after: ['buildQuery'], before: ['response'], handler: graphql }
  ]
);
