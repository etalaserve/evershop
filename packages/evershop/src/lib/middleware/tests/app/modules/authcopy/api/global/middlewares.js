import { defineMiddlewares } from '../../../../../../registry.js';
import auth from './auth.js';
import apiAuthGlobal from './apiAuthGlobal.js';

defineMiddlewares(
  { region: 'api', scope: 'app', routeId: null },
  [
    { id: 'auth', after: ['context'], before: ['apiResponse'], handler: auth },
    { id: 'apiAuthGlobal', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: apiAuthGlobal }
  ]
);
