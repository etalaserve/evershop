import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createPage from './createPage.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'createCmsPage', routeId: 'createCmsPage' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createPage', after: ['escapeHtml', 'auth'], before: ['finish'], handler: createPage },
    { id: 'finish', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: finish }
  ]
);
