import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import validatePath from './validatePath.js';
import multerFile from './multerFile.js';
import upload from './upload.js';

defineMiddlewares(
  { region: 'api', scope: 'fileUpload', routeId: 'fileUpload' },
  [
    { id: 'validatePath', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: validatePath },
    { id: 'multerFile', after: ['auth', 'validatePath'], before: ['apiResponse'], handler: multerFile },
    { id: 'upload', after: ['multerFile'], before: ['apiResponse'], handler: upload }
  ]
);
