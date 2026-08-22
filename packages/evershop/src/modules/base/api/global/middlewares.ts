import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import apiErrorHandler from './apiErrorHandler.js';
import apiResponse from './apiResponse.js';
import context from './context.js';
import escapeHtml from './escapeHtml.js';
import payloadValidate from './payloadValidate.js';

/**
 * The cross-cutting pipeline every API request passes through. `context`
 * and `apiErrorHandler` have no before/after (both were excluded from
 * `parseFromFile.js`'s default-assignment by id). `payloadValidate` and
 * `escapeHtml` each get an explicit `before: ['apiResponse']` here — that
 * was an IMPLICIT default in the old system (`parseFromFile.js` fills in
 * `before: ['apiResponse']` whenever an API-region middleware's filename
 * doesn't already specify a `before`), invisible from the bracket filenames
 * alone. Made explicit since there's no longer a filename to imply it.
 */
defineMiddlewares(
  { region: 'api', scope: 'app', routeId: null },
  [
    { id: 'context', handler: context },
    { id: 'payloadValidate', after: ['auth'], before: ['apiResponse'], handler: payloadValidate },
    { id: 'escapeHtml', after: ['payloadValidate'], before: ['apiResponse'], handler: escapeHtml },
    { id: 'apiResponse', after: ['auth'], before: ['apiErrorHandler'], handler: apiResponse },
    { id: 'apiErrorHandler', after: ['apiResponse'], handler: apiErrorHandler }
  ]
);
