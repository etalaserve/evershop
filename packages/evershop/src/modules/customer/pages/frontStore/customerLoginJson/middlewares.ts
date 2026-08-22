import { defineMiddlewares } from '../../../../../lib/middleware/registry.js';
import login from './login.js';

defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'customerLoginJson' },
  [{ id: 'login', after: ['bodyParser'], before: ['notFound'], handler: login }]
);
