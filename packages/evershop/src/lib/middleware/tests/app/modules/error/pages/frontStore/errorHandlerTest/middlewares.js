import { defineMiddlewares } from '../../../../../../../registry.js';
import errorInAsync from './errorInAsync.js';
import errorInAsyncWithNext from './errorInAsyncWithNext.js';
import errorInSync from './errorInSync.js';
import errorInSyncWithNext from './errorInSyncWithNext.js';

defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'errorHandlerTest' },
  [
    { id: 'errorInAsync', before: ['notFound'], after: ['auth'], handler: errorInAsync },
    { id: 'errorInAsyncWithNext', before: ['notFound'], after: ['auth'], handler: errorInAsyncWithNext },
    { id: 'errorInSync', before: ['notFound'], after: ['auth'], handler: errorInSync },
    { id: 'errorInSyncWithNext', before: ['notFound'], after: ['auth'], handler: errorInSyncWithNext }
  ]
);
