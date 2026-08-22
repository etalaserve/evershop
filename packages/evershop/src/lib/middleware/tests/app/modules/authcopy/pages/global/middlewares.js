import { defineMiddlewares } from '../../../../../../registry.js';
import auth from './auth.js';

defineMiddlewares(
  { region: 'pages', scope: 'app', routeId: null },
  [
    { id: 'auth', after: ['context'], before: ['notFound'], handler: auth }
  ]
);
