import { defineMiddlewares } from '../../../../../../registry.js';
import buildQuery from './buildQuery.js';
import graphql from './graphql.js';
import bodyParser from './bodyParser.js';

defineMiddlewares(
  { region: 'pages', scope: 'app', routeId: null },
  [
    { id: 'buildQuery', after: ['bodyParser'], before: ['graphql'], handler: buildQuery },
    { id: 'graphql', after: ['buildQuery'], before: ['notFound'], handler: graphql },
    { id: 'bodyParser', before: ['buildQuery'], after: ['auth'], handler: bodyParser }
  ]
);
