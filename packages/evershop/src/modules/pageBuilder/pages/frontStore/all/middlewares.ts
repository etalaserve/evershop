import { defineMiddlewares } from '../../../../../lib/middleware/registry.js';
import enforcePreviewThemeMatch from './enforcePreviewThemeMatch.js';

/**
 * These handlers were already plainly named under the bracket convention,
 * so they carried no explicit ordering and took the region's implicit
 * defaults. Those defaults are written out here.
 */
defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'frontStore' },
  [
    { id: 'enforcePreviewThemeMatch', after: ['auth'], before: ['notFound'], handler: enforcePreviewThemeMatch }
  ]
);
