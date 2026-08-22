import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import validatePath from './validatePath.js';
import deleteFile from './deleteFile.js';

defineMiddlewares(
  { region: 'api', scope: 'fileDelete', routeId: 'fileDelete' },
  [
    { id: 'validatePath', after: ['context'], before: ['auth'], handler: validatePath },
    { id: 'deleteFile', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: deleteFile }
  ]
);
