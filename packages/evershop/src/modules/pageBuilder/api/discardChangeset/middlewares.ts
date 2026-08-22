import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import discardChangeset from './discardChangeset.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'api', scope: 'discardChangeset', routeId: 'discardChangeset' },
  [
    { id: 'discardChangeset', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: discardChangeset }
  ]
);
