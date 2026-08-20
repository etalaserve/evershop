import { select, update } from '@evershop/postgres-query-builder';
import { data, Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Badge } from '~/components/ui/badge.js';
import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { pool } from '../../../lib/postgres/connection.js';

export async function loader({ params }: LoaderFunctionArgs) {
  const customer = await select()
    .from('customer')
    .where('uuid', '=', params.uuid!)
    .load(pool);
  if (!customer) {
    throw data('Customer not found', { status: 404 });
  }
  return { customer };
}

/** Mirrors the legacy `PATCH /api/customers/:id` handler's one job used here — toggling status. Direct DB write for the same reason the loader reads directly: this route already sits behind admin.tsx's session guard. */
export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const status = formData.get('status') === '1' ? 1 : 0;
  await update('customer')
    .given({ status })
    .where('uuid', '=', params.uuid!)
    .execute(pool);
  return redirect(`/admin/customers/${params.uuid}`);
}

export default function CustomerDetail({
  loaderData: { customer }
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/customers" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to customers
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{customer.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div>{customer.email}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <Badge variant={customer.status ? 'default' : 'outline'}>
              {customer.status ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Created</div>
            <div>{new Date(customer.created_at).toLocaleString()}</div>
          </div>
          <Form method="post" className="pt-2">
            <input type="hidden" name="status" value={customer.status ? '0' : '1'} />
            <Button type="submit" variant="outline">
              {customer.status ? 'Disable' : 'Enable'}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
