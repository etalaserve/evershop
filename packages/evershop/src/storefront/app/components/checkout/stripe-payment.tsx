import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useEffect, useMemo, useState } from 'react';

import { checkout, createStripePaymentIntent, type CheckoutPayload } from '~/lib/cart/client.js';
import { clearCartIdClient } from '~/lib/cart/session.js';

/**
 * Mirrors EverShop's own storefront Stripe integration
 * (`packages/evershop/src/modules/stripe/pages/frontStore/checkout/Stripe.tsx`):
 * the order is created FIRST via the normal checkout() call (payment_method
 * = "stripe", unpaid), then a PaymentIntent is created against that
 * order/cart pair, then Stripe's PaymentElement confirms it client-side.
 * `createPaymentIntent`'s payload requires `order_id` — there is no
 * "pay first, then create the order" path in EverShop's API.
 *
 * Not live-tested in this build (needs a real Stripe secret/publishable key
 * pair configured on the EverShop instance) — the request/response shapes
 * were verified against the source, not against a live Stripe account.
 */

let stripePromise: Promise<Stripe | null> | undefined;
function getStripe(publishableKey: string) {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

interface StripeCheckoutFormProps {
  cartId: string;
  payload: Omit<CheckoutPayload, 'paymentMethod'>;
  returnUrl: string;
  onError: (message: string) => void;
}

function StripeCheckoutForm({ cartId, payload, returnUrl, onError }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [placing, setPlacing] = useState(false);

  async function handlePlaceOrder() {
    if (!stripe || !elements) return;
    setPlacing(true);
    try {
      const submitResult = await elements.submit();
      if (submitResult.error) {
        onError(submitResult.error.message ?? 'Card details are invalid.');
        setPlacing(false);
        return;
      }

      const order = await checkout(cartId, { ...payload, paymentMethod: 'stripe' });
      const { clientSecret } = await createStripePaymentIntent(cartId, order.uuid);

      const confirmResult = await stripe.confirmPayment({
        clientSecret,
        elements,
        confirmParams: { return_url: `${returnUrl}?order_id=${order.uuid}` }
      });

      if (confirmResult.error) {
        onError(confirmResult.error.message ?? 'Payment failed. Please try again.');
        setPlacing(false);
        return;
      }
      // On success Stripe redirects to return_url itself; nothing further to do here.
      clearCartIdClient();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong placing your order.');
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <button
        type="button"
        onClick={handlePlaceOrder}
        disabled={!stripe || !elements || placing}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {placing ? 'Processing…' : 'Pay and place order'}
      </button>
    </div>
  );
}

export function StripePayment({
  publishableKey,
  amount,
  currency,
  paymentMode,
  cartId,
  payload,
  returnUrl,
  onError
}: {
  publishableKey: string;
  amount: number;
  currency: string;
  paymentMode: string;
  cartId: string;
  payload: Omit<CheckoutPayload, 'paymentMethod'>;
  returnUrl: string;
  onError: (message: string) => void;
}) {
  const options = useMemo(
    () => ({
      mode: 'payment' as const,
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      capture_method: (paymentMode === 'capture' ? 'automatic_async' : 'manual') as
        | 'automatic_async'
        | 'manual'
    }),
    [amount, currency, paymentMode]
  );

  const [stripe, setStripe] = useState<Stripe | null>(null);
  useEffect(() => {
    let cancelled = false;
    getStripe(publishableKey).then((s) => {
      if (!cancelled) setStripe(s);
    });
    return () => {
      cancelled = true;
    };
  }, [publishableKey]);

  if (!stripe) return null;

  return (
    <Elements stripe={stripe} options={options}>
      <StripeCheckoutForm cartId={cartId} payload={payload} returnUrl={returnUrl} onError={onError} />
    </Elements>
  );
}
