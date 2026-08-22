import { defineMiddlewares } from '../../../../../lib/middleware/registry.js';
import images from './images.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'images' },
  [
    { id: 'images', after: ['auth'], before: ['notFound'], handler: images }
  ]
);
