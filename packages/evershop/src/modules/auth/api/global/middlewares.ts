import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import auth from './auth.js';
import demoAccountBlocking from './demoAccountBlocking.js';
import getCurrentUser from './getCurrentUser.js';
import jwtUserAuth from './jwtUserAuth.js';

/**
 * Admin session/JWT resolution + access check, cross-cutting for every API
 * request. `getCurrentUser` had no explicit `before` in its filename — that
 * was an IMPLICIT default (`before: ['apiResponse']`, from `base/api/global`'s
 * defaulting rule, since `getCurrentUser`'s id isn't `context`/`apiErrorHandler`)
 * — made explicit here. Same for `auth`.
 */
defineMiddlewares(
  { region: 'api', scope: 'app', routeId: null },
  [
    { id: 'getCurrentUser', after: ['context'], before: ['apiResponse'], handler: getCurrentUser },
    { id: 'jwtUserAuth', after: ['context'], before: ['getCurrentUser'], handler: jwtUserAuth },
    { id: 'auth', after: ['getCurrentUser'], before: ['apiResponse'], handler: auth },
    { id: 'demoAccountBlocking', after: ['getCurrentUser'], before: ['auth'], handler: demoAccountBlocking }
  ]
);
