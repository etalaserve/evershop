import { defineMiddlewares } from '../../../../../../registry.js';
import afterIndex from './afterIndex.js';

defineMiddlewares(
  { region: 'api', scope: 'createA', routeId: 'createA' },
  [
    { id: 'afterIndex', after: ['index'], before: ['apiResponse'], handler: afterIndex }
  ]
);
