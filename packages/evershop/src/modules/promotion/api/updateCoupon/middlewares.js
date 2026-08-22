import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import bodyParser from './bodyParser.js';
import finish from './finish.js';
import updateCoupon from './updateCoupon.js';

defineMiddlewares(
  { region: 'api', scope: 'updateCoupon', routeId: 'updateCoupon' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'updateCoupon',
      after: ['escapeHtml', 'auth'],
      before: ['finish'],
      handler: updateCoupon
    },
    {
      id: 'finish',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: finish
    }
  ]
);
