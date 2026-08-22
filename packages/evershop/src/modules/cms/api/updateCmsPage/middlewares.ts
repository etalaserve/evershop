import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updatePage from './updatePage.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'updateCmsPage', routeId: 'updateCmsPage' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updatePage', after: ['escapeHtml', 'auth'], before: ['finish'], handler: updatePage },
    { id: 'finish', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: finish }
  ]
);
