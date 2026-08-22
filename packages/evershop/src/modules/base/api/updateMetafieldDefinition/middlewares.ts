import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import updateMetafieldDefinition from './updateMetafieldDefinition.js';

defineMiddlewares(
  { region: 'api', scope: 'updateMetafieldDefinition', routeId: 'updateMetafieldDefinition' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'updateMetafieldDefinition', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: updateMetafieldDefinition }
  ]
);
