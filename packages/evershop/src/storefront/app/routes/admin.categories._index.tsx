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

/**
 * Same "direct DB read, no GraphQL" approach as the customer grid — joins
 * category_description for name/url_key since categories are split across
 * two tables (see updateCategory.ts's own join pattern).
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword') ?? '';

  const query = select().from('category');
  query
    .leftJoin('category_description')
    .on(
      'category.category_id',
      '=',
      'category_description.category_description_category_id'
    );
  if (keyword) {
    query.andWhere('category_description.name', 'ILIKE', `%${keyword}%`);
  }
  query.orderBy('category.position', 'ASC');
  const categories = await query.execute(pool);

  return { categories, keyword };
}

export default function CategoryGrid({
  loaderData: { categories, keyword }
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
        <Link to="/admin/categories/new" className={buttonVariants({})}>
          Add category
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL key</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c: any) => (
              <TableRow key={c.category_id}>
                <TableCell>
                  <Link to={`/admin/categories/${c.uuid}`} className="font-medium underline-offset-2 hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.url_key}</TableCell>
                <TableCell>
                  <Badge variant={c.status ? 'default' : 'outline'}>{c.status ? 'Enabled' : 'Disabled'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {categories.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">There is no category to display</p>
        )}
      </CardContent>
    </Card>
  );
}
