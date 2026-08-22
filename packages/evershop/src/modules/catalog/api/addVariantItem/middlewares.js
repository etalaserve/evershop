import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import addItem from './addItem.js';

defineMiddlewares(
  { region: 'api', scope: 'addVariantItem', routeId: 'addVariantItem' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'addItem', after: ['bodyParser'], before: ['apiResponse'], handler: addItem }
  ]
);
