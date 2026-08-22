import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import saveShippingNote from './saveShippingNote.js';

defineMiddlewares(
  { region: 'api', scope: 'addShippingNote', routeId: 'addShippingNote' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'saveShippingNote', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: saveShippingNote }
  ]
);
