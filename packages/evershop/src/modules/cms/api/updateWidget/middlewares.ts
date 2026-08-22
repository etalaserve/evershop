import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateWidget from './updateWidget.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'updateWidget', routeId: 'updateWidget' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateWidget', after: ['escapeHtml', 'auth'], before: ['finish'], handler: updateWidget },
    { id: 'finish', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: finish }
  ]
);
