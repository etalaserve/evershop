import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import validateFileStorageConnection from './validateFileStorageConnection.js';

/**
 * Contributed by cms to the `setting` module's `saveSetting` route — same
 * routeId/scope, cross-module registration (see catalog/api/saveSetting for
 * the same pattern).
 */
defineMiddlewares(
  { region: 'api', scope: 'saveSetting', routeId: 'saveSetting' },
  [
    {
      id: 'validateFileStorageConnection',
      after: ['bodyParser'],
      before: ['saveSetting'],
      handler: validateFileStorageConnection
    }
  ]
);
