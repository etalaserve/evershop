import { select } from '@evershop/postgres-query-builder';
import { Form, Link } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { Badge } from '~/components/ui/badge.js';
import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '~/components/ui/table.js';
import { pool } from '../../../lib/postgres/connection.js';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword') ?? '';

  const query = select().from('order');
  if (keyword) {
    query.andWhere('order_number', 'ILIKE', `%${keyword}%`);
  }
  query.orderBy('created_at', 'DESC');
  const orders = await query.execute(pool);

  return { orders, keyword };
}

export default function OrderGrid({
  loaderData: { orders, keyword }
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  return (
    <Card>
      <CardHeader>
        <Form method="get" className="flex items-center gap-3">
          <Input type="search" name="keyword" placeholder="Search by order #" defaultValue={keyword} className="max-w-xs" />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </Form>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o: any) => (
              <TableRow key={o.order_id}>
                <TableCell>
                  <Link to={`/admin/orders/${o.uuid}`} className="font-medium underline-offset-2 hover:underline">
                    {o.order_number}
                  </Link>
                </TableCell>
                <TableCell>{o.customer_full_name || o.customer_email}</TableCell>
                <TableCell>
                  {o.currency} {Number(o.grand_total).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{o.status}</Badge>
                </TableCell>
                <TableCell>{new Date(o.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {orders.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">There is no order to display</p>
        )}
      </CardContent>
    </Card>
  );
}
