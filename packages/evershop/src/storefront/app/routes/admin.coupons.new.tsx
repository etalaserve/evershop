import { Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import createCoupon from '../../../modules/promotion/services/coupon/createCoupon.js';

/**
 * Deliberately smaller than the legacy coupon form (which also covers
 * per-product targeting, buy-X-get-Y rules, usage limits, customer
 * conditions, and a date range) — code, description, a flat or percentage
 * discount on the whole order, and status.
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try {
    const coupon = await createCoupon({
      coupon: String(formData.get('coupon') ?? ''),
      description: String(formData.get('description') ?? ''),
      discount_amount: Number(formData.get('discount_amount') ?? 0),
      discount_type: String(formData.get('discount_type') ?? 'fixed_discount_to_entire_order'),
      status: formData.get('status') === 'on' ? 1 : 0
    } as any);
    return redirect(`/admin/coupons/${coupon.uuid}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function NewCoupon({ actionData }: { actionData?: { error?: string } }) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/coupons" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to coupons
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New coupon</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.error && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Coupon code</label>
              <Input name="coupon" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Input name="description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Discount amount</label>
                <Input type="number" step="0.01" min="0" name="discount_amount" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Discount type</label>
                <select
                  name="discount_type"
                  defaultValue="fixed_discount_to_entire_order"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="fixed_discount_to_entire_order">Fixed amount</option>
                  <option value="percentage_discount_to_entire_order">Percentage</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked />
              Enabled
            </label>
            <Button type="submit">Create coupon</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
