import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createTaxClass from './createTaxClass.js';

/**
 * `bodyParser` was `[context]borderParser[auth].ts` under the old
 * convention — a pre-existing typo (every other module spells this
 * `bodyParser`), fixed here since this exact file was already being
 * renamed. `createTaxClass` was already plain (unbracketed), so it got
 * both implicit defaults (`after: ['escapeHtml', 'auth']`,
 * `before: ['apiResponse']`) — made explicit here.
 */
defineMiddlewares(
  { region: 'api', scope: 'createTaxClass', routeId: 'createTaxClass' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    { id: 'createTaxClass', after: ['escapeHtml', 'auth'], before: ['apiResponse'], handler: createTaxClass }
  ]
);
