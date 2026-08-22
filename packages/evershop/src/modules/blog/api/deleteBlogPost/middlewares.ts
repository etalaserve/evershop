import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import deleteBlogPost from './deleteBlogPost.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'api', scope: 'deleteBlogPost', routeId: 'deleteBlogPost' },
  [
    { id: 'deleteBlogPost', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: deleteBlogPost }
  ]
);
