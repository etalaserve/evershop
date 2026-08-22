import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import deleteAttributeGroup from './deleteAttributeGroup.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'api', scope: 'deleteAttributeGroup', routeId: 'deleteAttributeGroup' },
  [
    { id: 'deleteAttributeGroup', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: deleteAttributeGroup }
  ]
);
