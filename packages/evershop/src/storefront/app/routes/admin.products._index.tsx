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

  const query = select().from('product');
  query
    .leftJoin('product_description')
    .on('product.product_id', '=', 'product_description.product_description_product_id');
  if (keyword) {
    query.andWhere('product_description.name', 'ILIKE', `%${keyword}%`);
  }
  query.orderBy('product.created_at', 'DESC');
  const products = await query.execute(pool);

  return { products, keyword };
}

export default function ProductGrid({
  loaderData: { products, keyword }
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <Form method="get" className="flex items-center gap-3">
          <Input type="search" name="keyword" placeholder="Search by name" defaultValue={keyword} className="max-w-xs" />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </Form>
        <Link to="/admin/products/new" className={buttonVariants({})}>
          Add product
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p: any) => (
              <TableRow key={p.product_id}>
                <TableCell>
                  <Link to={`/admin/products/${p.uuid}`} className="font-medium underline-offset-2 hover:underline">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                <TableCell>${Number(p.price).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={p.status ? 'default' : 'outline'}>{p.status ? 'Enabled' : 'Disabled'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {products.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">There is no product to display</p>
        )}
      </CardContent>
    </Card>
  );
}
