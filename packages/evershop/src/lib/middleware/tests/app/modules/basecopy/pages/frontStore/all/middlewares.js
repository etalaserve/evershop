import { defineMiddlewares } from '../../../../../../../registry.js';
import title from './title.js';

defineMiddlewares(
  { region: 'pages', scope: 'frontStore', routeId: 'frontStore' },
  [
    { id: 'title', before: ['notFound'], after: ['auth'], handler: title }
  ]
);
