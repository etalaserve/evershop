import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import multerNone from './multerNone.js';
import unlinkVariants from './unlinkVariants.js';

defineMiddlewares(
  { region: 'api', scope: 'unlinkVariant', routeId: 'unlinkVariant' },
  [
    { id: 'multerNone', after: ['context'], before: ['auth'], handler: multerNone },
    {
      id: 'unlinkVariants',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: unlinkVariants
    }
  ]
);
