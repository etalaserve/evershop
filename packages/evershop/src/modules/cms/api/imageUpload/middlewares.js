import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import validatePath from './validatePath.js';
import multerFile from './multerFile.js';
import verifyImages from './verifyImages.js';
import upload from './upload.js';

defineMiddlewares(
  { region: 'api', scope: 'imageUpload', routeId: 'imageUpload' },
  [
    { id: 'validatePath', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: validatePath },
    { id: 'multerFile', after: ['auth', 'validatePath'], before: ['apiResponse'], handler: multerFile },
    { id: 'verifyImages', after: ['multerFile'], before: ['upload'], handler: verifyImages },
    { id: 'upload', after: ['multerFile'], before: ['apiResponse'], handler: upload }
  ]
);
