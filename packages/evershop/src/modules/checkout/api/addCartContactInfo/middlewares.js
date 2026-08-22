import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import saveContactInfo from './saveContactInfo.js';

defineMiddlewares(
  { region: 'api', scope: 'addCartContactInfo', routeId: 'addCartContactInfo' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'saveContactInfo', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: saveContactInfo }
  ]
);
