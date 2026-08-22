import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import applyCoupon from './applyCoupon.js';
import bodyParser from './bodyParser.js';
import validateCouponCode from './validateCouponCode.js';

defineMiddlewares(
  { region: 'api', scope: 'couponApply', routeId: 'couponApply' },
  [
    { id: 'bodyParser', after: ['context'], before: ['auth'], handler: bodyParser },
    {
      id: 'validateCouponCode',
      after: ['escapeHtml', 'auth'],
      before: ['apiResponse'],
      handler: validateCouponCode
    },
    {
      id: 'applyCoupon',
      after: ['validateCouponCode'],
      before: ['apiResponse'],
      handler: applyCoupon
    }
  ]
);
