import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createWidget from './createWidget.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'createWidget', routeId: 'createWidget' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createWidget', after: ['escapeHtml', 'auth'], before: ['finish'], handler: createWidget },
    { id: 'finish', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: finish }
  ]
);
