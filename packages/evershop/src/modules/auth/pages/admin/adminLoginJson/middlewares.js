import { defineMiddlewares } from '../../../../../lib/middleware/registry.js';
import logIn from './logIn.js';

defineMiddlewares(
  { region: 'pages', scope: 'admin', routeId: 'adminLoginJson' },
  [{ id: 'logIn', after: ['bodyParser'], before: ['notFound'], handler: logIn }]
);
