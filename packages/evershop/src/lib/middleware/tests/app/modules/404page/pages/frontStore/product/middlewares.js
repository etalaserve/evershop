import { defineMiddlewares } from '../../../../../../../registry.js';
import loadCategory from './loadCategory.js';
import loadProductImage from './loadProductImage.js';
import loadProduct from './loadProduct.js';

defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'product' },
  [
    { id: 'loadCategory', after: ['loadProduct'], before: ['notFound'], handler: loadCategory },
    { id: 'loadProductImage', after: ['loadProduct'], before: ['notFound'], handler: loadProductImage },
    { id: 'loadProduct', before: ['notFound'], after: ['auth'], handler: loadProduct }
  ]
);
