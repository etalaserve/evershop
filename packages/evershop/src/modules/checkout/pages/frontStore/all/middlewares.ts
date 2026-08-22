import { defineMiddlewares } from '../../../../../lib/middleware/registry.js';
import addCustomerToCart from './addCustomerToCart.js';

defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'frontStore' },
  [{ id: 'addCustomerToCart', after: ['auth'], before: ['notFound'], handler: addCustomerToCart }]
);
