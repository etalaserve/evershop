import { defineMiddlewares } from '../../../../../../../registry.js';
import adminTitle from './adminTitle.js';

defineMiddlewares(
  { region: 'pages', scope: 'admin', routeId: 'admin' },
  [
    { id: 'adminTitle', before: ['notFound'], after: ['auth'], handler: adminTitle }
  ]
);
