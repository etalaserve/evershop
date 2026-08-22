import { defineMiddlewares } from '../../../../../../registry.js';
import apiErrorHandler from './apiErrorHandler.js';
import apiResponse from './apiResponse.js';
import payloadValidate from './payloadValidate.js';
import escapeHtml from './escapeHtml.js';
import context from './context.js';

defineMiddlewares(
  { region: 'api', scope: 'app', routeId: null },
  [
    { id: 'apiErrorHandler', after: ['apiResponse'], handler: apiErrorHandler },
    { id: 'apiResponse', after: ['auth'], before: ['apiErrorHandler'], handler: apiResponse },
    { id: 'payloadValidate', after: ['auth'], before: ['apiResponse'], handler: payloadValidate },
    { id: 'escapeHtml', after: ['payloadValidate'], before: ['apiResponse'], handler: escapeHtml },
    { id: 'context', handler: context }
  ]
);
