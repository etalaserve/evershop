import { defineMiddlewares } from '../../../../../../registry.js';
import notFound from './notFound.js';
import dummy from './dummy.js';
import errorHandler from './errorHandler.js';
import context from './context.js';
import response from './response.js';

defineMiddlewares(
  { region: 'pages', scope: 'app', routeId: null },
  [
    { id: 'notFound', after: ['auth'], before: ['response'], handler: notFound },
    { id: 'dummy', after: ['notFound'], before: ['response'], handler: dummy },
    { id: 'errorHandler', after: ['response'], handler: errorHandler },
    { id: 'context', handler: context },
    { id: 'response', before: ['errorHandler'], after: ['auth'], handler: response }
  ]
);
