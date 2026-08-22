import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import finish from './finish.js';
import updateLandingPage from './updateLandingPage.js';

defineMiddlewares(
  { region: 'api', scope: 'updateLandingPage', routeId: 'updateLandingPage' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'updateLandingPage',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: updateLandingPage
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
