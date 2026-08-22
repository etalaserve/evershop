import { defineMiddlewares } from '../../../../../lib/middleware/registry.js';
import index from './index.js';
import typeValidate from './typeValidate.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'pages', scope: 'admin', routeId: 'widgetNew' },
  [
    { id: 'index', after: ['auth'], before: ['notFound'], handler: index },
    { id: 'typeValidate', after: ['auth'], before: ['notFound'], handler: typeValidate }
  ]
);
