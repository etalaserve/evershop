import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createMetafieldDefinition from './createMetafieldDefinition.js';

defineMiddlewares(
  { region: 'api', scope: 'createMetafieldDefinition', routeId: 'createMetafieldDefinition' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createMetafieldDefinition', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createMetafieldDefinition }
  ]
);
