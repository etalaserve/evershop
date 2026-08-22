import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import getCurrentCustomer from './getCurrentCustomer.js';
import jwtCustomerAuth from './jwtCustomerAuth.js';

/**
 * Storefront customer session/JWT resolution, cross-cutting for every API
 * request. `before: ['auth']` here refers to the admin `auth` middleware
 * registered in `modules/auth/api/global` — cross-module dependency
 * references already worked this way under the bracket convention (the
 * topological sort operates over the full merged per-region set, not per
 * module), and continue to here.
 */
defineMiddlewares(
  { region: 'api', scope: 'app', routeId: null },
  [
    { id: 'getCurrentCustomer', after: ['context'], before: ['auth'], handler: getCurrentCustomer },
    { id: 'jwtCustomerAuth', after: ['context'], before: ['getCurrentCustomer'], handler: jwtCustomerAuth }
  ]
);
