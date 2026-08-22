import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createLandingPage from './createLandingPage.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'createLandingPage', routeId: 'createLandingPage' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'createLandingPage',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: createLandingPage
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
