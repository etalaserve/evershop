import { defineMiddlewares } from '../../../../../../../registry.js';
import asyncWithNext from './asyncWithNext.js';
import async from './async.js';
import returnOne from './returnOne.js';
import returnThree from './returnThree.js';
import returnTwo from './returnTwo.js';
import collection from './collection.js';
import syncOne from './syncOne.js';
import syncWithNext from './syncWithNext.js';
import sync from './sync.js';

defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'delegateTest' },
  [
    { id: 'asyncWithNext', before: ['collection'], after: ['auth'], handler: asyncWithNext },
    { id: 'async', before: ['collection'], after: ['auth'], handler: async },
    { id: 'returnOne', before: ['returnTwo'], after: ['auth'], handler: returnOne },
    { id: 'returnThree', before: ['collection'], after: ['auth'], handler: returnThree },
    { id: 'returnTwo', before: ['returnThree'], after: ['auth'], handler: returnTwo },
    { id: 'collection', before: ['notFound'], after: ['auth'], handler: collection },
    { id: 'syncOne', before: ['notFound'], after: ['auth'], handler: syncOne },
    { id: 'syncWithNext', before: ['collection'], after: ['auth'], handler: syncWithNext },
    { id: 'sync', before: ['collection'], after: ['auth'], handler: sync }
  ]
);
