import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import validatePath from './validatePath.js';
import browFiles from './browFiles.js';

defineMiddlewares(
  { region: 'api', scope: 'fileBrowser', routeId: 'fileBrowser' },
  [
    { id: 'validatePath', after: ['context'], before: ['auth'], handler: validatePath },
    { id: 'browFiles', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: browFiles }
  ]
);
