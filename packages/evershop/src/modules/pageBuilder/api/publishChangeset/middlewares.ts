import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import publishChangeset from './publishChangeset.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'api', scope: 'publishChangeset', routeId: 'publishChangeset' },
  [
    { id: 'publishChangeset', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: publishChangeset }
  ]
);
