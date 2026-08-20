import { useState } from 'react';
import { redirect, useLoaderData, useNavigate } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';

import { StripePayment } from '~/components/checkout/stripe-payment.js';
import { Button } from '~/components/ui/button.js';
import { Input } from '~/components/ui/input.js';
import { Separator } from '~/components/ui/separator.js';
import { checkout, type CheckoutAddress, type CheckoutPayload } from '~/lib/cart/client.js';
import { clearCartIdClient, getCartIdFromRequest } from '~/lib/cart/session.js';
import { gql } from '~/lib/graphql/client.js';
import { gqlClient } from '~/lib/graphql/client-side.js';
import {
  CHECKOUT_CART_QUERY,
  SHIPPING_METHODS_QUERY,
  type CheckoutCartResponse,
  type ShippingMethodsResponse
} from '~/lib/graphql/queries/checkout.js';
import {
  COUNTRIES_QUERY,
  PROVINCES_QUERY,
  type CountriesResponse,
  type ProvincesResponse
} from '~/lib/graphql/queries/customer.js';
import { buildMeta } from '~/lib/seo.js';

export const meta: MetaFunction = () => buildMeta({ title: 'Checkout', noindex: true });

export async function loader({ request }: LoaderFunctionArgs) {
  const cartId = getCartIdFromRequest(request);
  if (!cartId) {
    throw redirect('/cart');
  }
  const [{ cart, setting }, { countries }] = await Promise.all([
    gql<CheckoutCartResponse>(CHECKOUT_CART_QUERY, { id: cartId }),
    gql<CountriesResponse>(COUNTRIES_QUERY)
  ]);
  if (!cart || !cart.items || cart.items.length === 0) {
    throw redirect('/cart');
  }
  return { cartId, cart, setting, countries };
}

interface ShippingMethodOption {
  id: string;
  providerCode: string;
  code: string;
  name: string;
  cost: { value: number; text: string };
}

export default function CheckoutPage() {
  const { cartId, cart, setting, countries } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [email, setEmail] = useState(cart.customerEmail ?? '');
  const [address, setAddress] = useState({
    fullName: '',
    address1: '',
    address2: '',
    city: '',
    country: countries[0]?.code ?? 'US',
    province: '',
    postcode: '',
    telephone: ''
  });
  const [provinces, setProvinces] = useState<Array<{ code: string; name: string }>>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethodOption[] | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethodOption | null>(null);
  const [selectedPayment, setSelectedPayment] = useState(cart.availablePaymentMethods[0]?.code ?? '');
  const [loadingRates, setLoadingRates] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCountryChange(code: string) {
    setAddress((a) => ({ ...a, country: code, province: '' }));
    const result = await gqlClient<ProvincesResponse>(PROVINCES_QUERY, { countries: [code] });
    setProvinces(result.provinces);
  }

  async function loadShippingRates() {
    if (!address.country || !address.postcode) {
      setError('Enter your country and postal code to see shipping options.');
      return;
    }
    setLoadingRates(true);
    setError(null);
    try {
      const result = await gqlClient<ShippingMethodsResponse>(SHIPPING_METHODS_QUERY, {
        id: cartId,
        country: address.country,
        province: address.province || undefined,
        postcode: address.postcode
      });
      const methods = result.cart?.availableShippingMethods ?? [];
      setShippingMethods(methods);
      setSelectedShipping(methods[0] ?? null);
      if (methods.length === 0) {
        setError('No shipping methods are available for this address.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load shipping options.');
    } finally {
      setLoadingRates(false);
    }
  }

  function buildAddress(): CheckoutAddress {
    return {
      full_name: address.fullName,
      address_1: address.address1,
      address_2: address.address2 || undefined,
      city: address.city,
      province: address.province,
      country: address.country,
      postcode: address.postcode,
      telephone: address.telephone
    };
  }

  const basePayload: Omit<CheckoutPayload, 'paymentMethod'> | null =
    email && selectedShipping
      ? {
          cart_id: cartId,
          customer: { email },
          shippingAddress: buildAddress(),
          billingAddress: buildAddress(),
          shippingMethod: selectedShipping.code,
          shippingProvider: selectedShipping.providerCode
        }
      : null;

  async function handlePlaceOrder() {
    if (!basePayload) {
      setError('Fill in your email and select a shipping method first.');
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const order = await checkout(cartId, { ...basePayload, paymentMethod: selectedPayment });
      clearCartIdClient();
      navigate(`/order/${order.uuid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place your order.');
      setPlacing(false);
    }
  }

  const isStripeSelected = selectedPayment === 'stripe' && setting.stripePublishableKey;
  const returnUrl = typeof window !== 'undefined' ? `${window.location.origin}/order` : '';

  // cart.grandTotal reflects the cart's PERSISTED shipping method — still
  // unset until checkout() actually submits, so it silently shows $0
  // shipping while the shopper is only previewing rates client-side (a real
  // bug caught by clicking through this in a browser: the summary's total
  // never moved when a shipping method was selected). Recompute from
  // subtotal + whatever's selected right now instead of trusting grandTotal.
  const totalValue = cart.subTotal.value + (selectedShipping?.cost.value ?? 0);
  const displayTotal = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: cart.currency
  }).format(totalValue);

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-3">
      <div className="space-y-6 md:col-span-2">
        <section className="space-y-3">
          <h2 className="font-semibold">Contact</h2>
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Shipping address</h2>
          <Input
            placeholder="Full name"
            value={address.fullName}
            onChange={(e) => setAddress((a) => ({ ...a, fullName: e.target.value }))}
          />
          <Input
            placeholder="Address"
            value={address.address1}
            onChange={(e) => setAddress((a) => ({ ...a, address1: e.target.value }))}
          />
          <Input
            placeholder="Apartment, suite, etc. (optional)"
            value={address.address2}
            onChange={(e) => setAddress((a) => ({ ...a, address2: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="City"
              value={address.city}
              onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
            />
            <Input
              placeholder="Postal code"
              value={address.postcode}
              onChange={(e) => setAddress((a) => ({ ...a, postcode: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={address.country}
              onChange={(e) => handleCountryChange(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={address.province}
              onChange={(e) => setAddress((a) => ({ ...a, province: e.target.value }))}
              disabled={provinces.length === 0}
            >
              <option value="">{provinces.length ? 'Select province/state' : 'N/A'}</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            placeholder="Phone number"
            value={address.telephone}
            onChange={(e) => setAddress((a) => ({ ...a, telephone: e.target.value }))}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Shipping method</h2>
            <Button type="button" variant="outline" size="sm" onClick={loadShippingRates} disabled={loadingRates}>
              {loadingRates ? 'Loading…' : 'Get shipping options'}
            </Button>
          </div>
          {shippingMethods && (
            <div className="space-y-2">
              {shippingMethods.map((method) => (
                <label
                  key={method.id}
                  className="flex cursor-pointer items-center justify-between rounded-md border border-input p-3 text-sm has-[:checked]:border-primary"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={selectedShipping?.id === method.id}
                      onChange={() => setSelectedShipping(method)}
                    />
                    {method.name}
                  </span>
                  <span>{method.cost.text}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Payment method</h2>
          {cart.availablePaymentMethods.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment methods are enabled for this store yet.</p>
          ) : (
            <div className="space-y-2">
              {cart.availablePaymentMethods.map((method) => (
                <label
                  key={method.code}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 text-sm has-[:checked]:border-primary"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={selectedPayment === method.code}
                    onChange={() => setSelectedPayment(method.code)}
                  />
                  {method.name}
                </label>
              ))}
            </div>
          )}

          {isStripeSelected && basePayload && (
            <StripePayment
              publishableKey={setting.stripePublishableKey!}
              amount={totalValue}
              currency={cart.currency}
              paymentMode={setting.stripePaymentMode ?? 'capture'}
              cartId={cartId}
              payload={basePayload}
              returnUrl={returnUrl}
              onError={setError}
            />
          )}
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!isStripeSelected && (
          <Button size="lg" className="w-full" onClick={handlePlaceOrder} disabled={placing || !basePayload}>
            {placing ? 'Placing order…' : 'Place order'}
          </Button>
        )}
      </div>

      <aside className="space-y-4 rounded-lg border border-border p-4 md:col-span-1">
        <h2 className="font-semibold">Order summary</h2>
        <div className="space-y-2">
          {cart.items!.map((item) => (
            <div key={item.uuid} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.productName} × {item.qty}
              </span>
              <span>{item.lineTotal.text}</span>
            </div>
          ))}
        </div>
        <Separator />
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{cart.subTotal.text}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Shipping</span>
          <span>{selectedShipping ? selectedShipping.cost.text : cart.shippingFeeInclTax.text}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{displayTotal}</span>
        </div>
      </aside>
    </div>
  );
}
