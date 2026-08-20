import { select } from '@evershop/postgres-query-builder';
import { data, Form, Link } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Badge } from '~/components/ui/badge.js';
import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table.js';
import cancelOrder from '../../../modules/oms/services/cancelOrder.js';
import { pool } from '../../../lib/postgres/connection.js';

/**
 * Order status itself is derived (payment + shipment status →
 * `psoMapping` → `order.status`), never set directly — so this stays
 * read-only for status. What IS a direct admin action: cancelling the
 * order, and capturing/refunding payment. Those go through
 * `cancelOrder()` (direct service import, same convention as every other
 * admin action this session) and the payment modules' own REST endpoints
 * (`/api/cod/captures`, `/api/stripe/paymentIntents/{capture,refund}`,
 * `/api/paypal/authorizations/capture`) — those touch real payment-provider
 * APIs (Stripe/PayPal), so reusing the existing, already-tested handlers
 * beats reimplementing provider calls here.
 */
async function callLegacyApi(path: string, body: Record<string, unknown>, cookie: string | null) {
  const res = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json;
}

export async function loader({ params }: LoaderFunctionArgs) {
  const order = await select().from('order').where('uuid', '=', params.uuid!).load(pool);
  if (!order) {
    throw data('Order not found', { status: 404 });
  }
  const items = await select()
    .from('order_item')
    .where('order_item_order_id', '=', order.order_id)
    .execute(pool);
  return { order, items };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');
  const cookie = request.headers.get('Cookie');

  try {
    if (intent === 'cancel') {
      await cancelOrder(params.uuid!, String(formData.get('reason') ?? ''));
    } else if (intent === 'codCapture') {
      await callLegacyApi('/api/cod/captures', { order_id: params.uuid }, cookie);
    } else if (intent === 'stripeCapture') {
      await callLegacyApi('/api/stripe/paymentIntents/capture', { order_id: params.uuid }, cookie);
    } else if (intent === 'stripeRefund') {
      await callLegacyApi('/api/stripe/paymentIntents/refund', { order_id: params.uuid, amount: Number(formData.get('amount')) }, cookie);
    } else if (intent === 'paypalCapture') {
      await callLegacyApi('/api/paypal/authorizations/capture', { order_id: params.uuid }, cookie);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Action failed' };
  }
}

export default function OrderDetail({
  loaderData: { order, items },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { success: boolean; error?: string };
}) {
  const o = order as any;
  const canCancel = !['canceled', 'closed'].includes(o.status);
  const paymentStatus = o.payment_status as string | null;

  return (
    <div className="max-w-3xl space-y-4">
      <Link to="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to orders
      </Link>
      {actionData?.success && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Done.</p>}
      {actionData && !actionData.success && <p className="text-sm text-destructive">{actionData.error}</p>}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-lg">Order {o.order_number}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{o.status}</Badge>
            {paymentStatus && <Badge variant="secondary">{paymentStatus}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Customer</div>
              <div>{o.customer_full_name || o.customer_email}</div>
              <div className="text-muted-foreground">{o.customer_email}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Placed</div>
              <div>{new Date(o.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Payment method</div>
              <div>{o.payment_method_name || o.payment_method}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Grand total</div>
              <div className="font-medium">
                {o.currency} {Number(o.grand_total).toFixed(2)}
              </div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.order_item_id}>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.product_sku}</TableCell>
                  <TableCell>{item.qty}</TableCell>
                  <TableCell>{Number(item.final_price_incl_tax).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {o.payment_method === 'cod' && paymentStatus === 'pending' && (
            <Form method="post">
              <Button type="submit" name="intent" value="codCapture" variant="outline">
                Capture payment (COD)
              </Button>
            </Form>
          )}
          {o.payment_method === 'stripe' && paymentStatus === 'stripe_authorized' && (
            <Form method="post">
              <Button type="submit" name="intent" value="stripeCapture" variant="outline">
                Capture payment
              </Button>
            </Form>
          )}
          {o.payment_method === 'stripe' && ['stripe_captured', 'stripe_partial_refunded'].includes(paymentStatus ?? '') && (
            <Form method="post" className="flex items-center gap-2">
              <Input type="number" step="0.01" name="amount" defaultValue={Number(o.grand_total).toFixed(2)} className="w-28" />
              <Button type="submit" name="intent" value="stripeRefund" variant="outline">
                Refund
              </Button>
            </Form>
          )}
          {o.payment_method === 'paypal' && paymentStatus === 'paypal_authorized' && (
            <Form method="post">
              <Button type="submit" name="intent" value="paypalCapture" variant="outline">
                Capture payment
              </Button>
            </Form>
          )}
          {canCancel && (
            <Form method="post" className="flex items-center gap-2">
              <Input name="reason" placeholder="Cancellation reason (optional)" className="w-56" />
              <Button type="submit" name="intent" value="cancel" variant="destructive">
                Cancel order
              </Button>
            </Form>
          )}
          {!canCancel && <p className="text-sm text-muted-foreground">No actions available for a {o.status} order.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
