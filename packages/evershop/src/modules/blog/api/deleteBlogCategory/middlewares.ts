import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import deleteBlogCategory from './deleteBlogCategory.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'api', scope: 'deleteBlogCategory', routeId: 'deleteBlogCategory' },
  [
    { id: 'deleteBlogCategory', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: deleteBlogCategory }
  ]
);
