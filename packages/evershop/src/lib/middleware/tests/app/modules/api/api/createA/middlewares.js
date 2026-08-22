import { defineMiddlewares } from '../../../../../../registry.js';
import index from './index.js';

defineMiddlewares(
  { region: 'api', scope: 'createA', routeId: 'createA' },
  [
    { id: 'index', before: ['apiResponse'], after: ['escapeHtml', 'auth'], handler: index }
  ]
);
