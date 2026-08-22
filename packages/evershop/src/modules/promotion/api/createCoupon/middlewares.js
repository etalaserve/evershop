import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import createCoupon from './createCoupon.js';
import finish from './finish.js';

defineMiddlewares(
  { region: 'api', scope: 'createCoupon', routeId: 'createCoupon' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'createCoupon',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: createCoupon
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
