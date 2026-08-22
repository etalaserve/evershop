import { defineMiddlewares } from '../../../../../../../registry.js';
import loadOptions from './loadOptions.js';
import loadAttribute from './loadAttribute.js';
import loadCategory from './loadCategory.js';
import loadProductImage from './loadProductImage.js';
import checkExecutionOrderAsync from './checkExecutionOrderAsync.js';
import checkExecutionOrder from './checkExecutionOrder.js';
import asyncOne from './asyncOne.js';
import loadProduct from './loadProduct.js';
import syncOne from './syncOne.js';

defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'middleware' },
  [
    { id: 'loadOptions', after: ['loadAttribute'], before: ['notFound'], handler: loadOptions },
    { id: 'loadAttribute', after: ['loadProductImage'], before: ['notFound'], handler: loadAttribute },
    { id: 'loadCategory', after: ['loadProduct'], before: ['notFound'], handler: loadCategory },
    { id: 'loadProductImage', after: ['loadProduct'], before: ['notFound'], handler: loadProductImage },
    { id: 'checkExecutionOrderAsync', after: ['syncOne', 'asyncOne'], before: ['loadAttribute'], handler: checkExecutionOrderAsync },
    { id: 'checkExecutionOrder', after: ['syncOne', 'asyncOne'], before: ['loadAttribute'], handler: checkExecutionOrder },
    { id: 'asyncOne', before: ['loadAttribute'], after: ['auth'], handler: asyncOne },
    { id: 'loadProduct', before: ['loadAttribute'], after: ['auth'], handler: loadProduct },
    { id: 'syncOne', before: ['loadAttribute'], after: ['auth'], handler: syncOne }
  ]
);
