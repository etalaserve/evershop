import { defineMiddlewares } from '../../../../../lib/middleware/registry.js';
import auth from './auth.js';

defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'frontStore' },
  [{ id: 'auth', after: ['context'], before: ['notFound'], handler: auth }]
);
