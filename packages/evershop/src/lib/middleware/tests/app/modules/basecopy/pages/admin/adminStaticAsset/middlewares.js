import { defineMiddlewares } from '../../../../../../../registry.js';
import staticAssets from './staticAssets.js';

defineMiddlewares(
  { region: 'pages', scope: 'admin', routeId: 'adminStaticAsset' },
  [
    { id: 'staticAssets', before: ['notFound'], after: ['auth'], handler: staticAssets }
  ]
);
