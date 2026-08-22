import { defineMiddlewares } from '../../../../../lib/middleware/registry.js';
import isAdmin from './isAdmin.js';

defineMiddlewares(
  { region: 'pages', scope: 'admin', routeId: 'admin' },
  [{ id: 'isAdmin', after: ['context'], before: ['auth'], handler: isAdmin }]
);
