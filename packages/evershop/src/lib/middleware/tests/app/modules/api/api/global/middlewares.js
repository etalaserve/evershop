import { defineMiddlewares } from '../../../../../../registry.js';
import apiGlobal from './apiGlobal.js';

defineMiddlewares(
  { region: 'api', scope: 'app', routeId: null },
  [
    { id: 'apiGlobal', before: ['apiResponse'], after: ['escapeHtml', 'auth'], handler: apiGlobal }
  ]
);
