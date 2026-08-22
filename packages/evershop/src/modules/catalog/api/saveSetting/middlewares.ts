import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import validateRecommendationSettings from './validateRecommendationSettings.js';

/**
 * Contributed by catalog to the `setting` module's `saveSetting` route —
 * same routeId/scope, cross-module registration (mirrors the cms
 * file-storage precedent). Registers alongside `setting/api/saveSetting`'s
 * own `bodyParser`/`saveSetting` entries in the same `Handler.middlewares`
 * list; the shared `sortMiddlewares` pass merges them by dependency order.
 */
defineMiddlewares(
  { region: 'api', scope: 'saveSetting', routeId: 'saveSetting' },
  [
    {
      id: 'validateRecommendationSettings',
      after: ['bodyParser', 'auth'],
      before: ['saveSetting'],
      handler: validateRecommendationSettings
    }
  ]
);
