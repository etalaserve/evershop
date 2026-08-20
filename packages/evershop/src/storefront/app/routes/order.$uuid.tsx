import { data, Link, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';

import { Separator } from '~/components/ui/separator.js';
import { buttonVariants } from '~/components/ui/button.js';
import { gql } from '~/lib/graphql/client.js';
import { ORDER_QUERY, type OrderDetailResponse } from '~/lib/graphql/queries/checkout.js';
import { imageUrl } from '~/lib/image.js';
import { buildMeta } from '~/lib/seo.js';
import { cn } from '~/lib/utils.js';

// Order UUIDs are unguessable but not secret — noindex so a shared link
// doesn't end up in search results.
export const meta: MetaFunction = () => buildMeta({ title: 'Order confirmed', noindex: true });

export async function loader({ params }: LoaderFunctionArgs) {
  const uuid = params.uuid!;
  // `order(uuid:)` is intentionally public with no ownership check (matches
  // EverShop's own order-confirmation-by-link pattern) — the uuid itself is
  // the access control.
  const result = await gql<OrderDetailResponse>(ORDER_QUERY, { uuid });
  if (!result.order) {
    throw data('Order not found', { status: 404 });
  }
  return { order: result.order };
}

export default function OrderConfirmationPage() {
  const { order } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-muted-foreground">Order confirmed</p>
        <h1 className="text-2xl font-semibold">Thank you, {order.customerFullName || order.customerEmail}!</h1>
        <p className="text-sm text-muted-foreground">Order #{order.orderNumber} · {order.status?.name}</p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="space-y-2">
          {order.items?.map((item) => (
            <div key={item.uuid} className="flex items-center gap-3 text-sm">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.thumbnail && (
                  <img src={imageUrl(item.thumbnail)} alt={item.productName ?? ''} className="h-full w-full object-cover" />
                )}
              </div>
              <span className="flex-1 text-muted-foreground">
                {item.productName} × {item.qty}
              </span>
              <span>{item.lineTotal.text}</span>
            </div>
          ))}
        </div>
        <Separator className="my-3" />
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{order.subTotal.text}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping ({order.shippingMethodName})</span>
            <span>{order.shippingFeeInclTax.text}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{order.grandTotal.text}</span>
          </div>
        </div>
      </div>

      {order.shippingAddress && (
        <div className="rounded-lg border border-border p-4 text-sm">
          <h2 className="mb-2 font-semibold">Shipping to</h2>
          <p>{order.shippingAddress.fullName}</p>
          <p>{order.shippingAddress.address1}</p>
          {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
          <p>
            {order.shippingAddress.city}, {order.shippingAddress.province?.name} {order.shippingAddress.postcode}
          </p>
          <p>{order.shippingAddress.country?.name}</p>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">Paid via {order.paymentMethodName}</p>

      <Link to="/" className={cn(buttonVariants(), 'w-full')}>
        Continue shopping
      </Link>
    </div>
  );
}
