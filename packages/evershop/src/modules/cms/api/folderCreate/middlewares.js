import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import validatePath from './validatePath.js';
import createFolder from './createFolder.js';

defineMiddlewares(
  { region: 'api', scope: 'folderCreate', routeId: 'folderCreate' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'validatePath', after: ['context'], before: ['auth'], handler: validatePath },
    { id: 'createFolder', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createFolder }
  ]
);
