import { select } from '@evershop/postgres-query-builder';
import { Form, Link } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { Badge } from '~/components/ui/badge.js';
import { Button, buttonVariants } from '~/components/ui/button.js';
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

  const query = select().from('coupon');
  if (keyword) {
    query.andWhere('coupon', 'ILIKE', `%${keyword}%`);
  }
  query.orderBy('created_at', 'DESC');
  const coupons = await query.execute(pool);

  return { coupons, keyword };
}

export default function CouponGrid({
  loaderData: { coupons, keyword }
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <Form method="get" className="flex items-center gap-3">
          <Input type="search" name="keyword" placeholder="Search by code" defaultValue={keyword} className="max-w-xs" />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </Form>
        <Link to="/admin/coupons/new" className={buttonVariants({})}>
          Add coupon
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c: any) => (
              <TableRow key={c.coupon_id}>
                <TableCell>
                  <Link to={`/admin/coupons/${c.uuid}`} className="font-medium underline-offset-2 hover:underline">
                    {c.coupon}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.description}</TableCell>
                <TableCell>
                  {c.discount_type === 'percentage_discount_to_entire_order'
                    ? `${c.discount_amount}%`
                    : `$${Number(c.discount_amount).toFixed(2)}`}
                </TableCell>
                <TableCell>
                  <Badge variant={c.status ? 'default' : 'outline'}>{c.status ? 'Enabled' : 'Disabled'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {coupons.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">There is no coupon to display</p>
        )}
      </CardContent>
    </Card>
  );
}
