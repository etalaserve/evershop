import { defineMiddlewares } from '../../../../../../../registry.js';
import staticAssets from './staticAssets.js';

defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'staticAsset' },
  [
    { id: 'staticAssets', after: ['context'], before: ['auth'], handler: staticAssets }
  ]
);
