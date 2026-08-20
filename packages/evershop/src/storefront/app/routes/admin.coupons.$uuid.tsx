import { select } from '@evershop/postgres-query-builder';
import { data, Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import deleteCoupon from '../../../modules/promotion/services/coupon/deleteCoupon.js';
import updateCoupon from '../../../modules/promotion/services/coupon/updateCoupon.js';
import { pool } from '../../../lib/postgres/connection.js';

export async function loader({ params }: LoaderFunctionArgs) {
  const coupon = await select().from('coupon').where('uuid', '=', params.uuid!).load(pool);
  if (!coupon) {
    throw data('Coupon not found', { status: 404 });
  }
  return { coupon };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  if (formData.get('intent') === 'delete') {
    await deleteCoupon(params.uuid!, {});
    return redirect('/admin/coupons');
  }
  try {
    await updateCoupon(params.uuid!, {
      coupon: String(formData.get('coupon') ?? ''),
      description: String(formData.get('description') ?? ''),
      discount_amount: Number(formData.get('discount_amount') ?? 0),
      discount_type: String(formData.get('discount_type') ?? 'fixed_discount_to_entire_order'),
      status: formData.get('status') === 'on' ? 1 : 0
    } as any);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function CouponDetail({
  loaderData: { coupon },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { success: boolean; error?: string };
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/coupons" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to coupons
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{coupon.coupon}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.success && (
              <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Saved.</p>
            )}
            {actionData && !actionData.success && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Coupon code</label>
              <Input name="coupon" defaultValue={coupon.coupon} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Input name="description" defaultValue={coupon.description} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Discount amount</label>
                <Input type="number" step="0.01" min="0" name="discount_amount" defaultValue={coupon.discount_amount} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Discount type</label>
                <select
                  name="discount_type"
                  defaultValue={coupon.discount_type}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="fixed_discount_to_entire_order">Fixed amount</option>
                  <option value="percentage_discount_to_entire_order">Percentage</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked={coupon.status} />
              Enabled
            </label>
            <div className="flex items-center justify-between pt-2">
              <Button type="submit">Save</Button>
              <Button type="submit" name="intent" value="delete" variant="destructive">
                Delete
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
