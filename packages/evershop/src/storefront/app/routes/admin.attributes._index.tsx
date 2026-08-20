import { select } from '@evershop/postgres-query-builder';
import { Form, Link } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { Badge } from '~/components/ui/badge.js';
import { Button, buttonVariants } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table.js';
import { pool } from '../../../lib/postgres/connection.js';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword') ?? '';
  const query = select().from('attribute');
  if (keyword) query.where('attribute_name', 'ILIKE', `%${keyword}%`);
  query.orderBy('sort_order', 'ASC');
  const attributes = await query.execute(pool);
  return { attributes, keyword };
}

export default function AttributeGrid({ loaderData: { attributes, keyword } }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <Form method="get" className="flex items-center gap-3">
          <Input type="search" name="keyword" placeholder="Search by name" defaultValue={keyword} className="max-w-xs" />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </Form>
        <Link to="/admin/attributes/new" className={buttonVariants({})}>
          Add attribute
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Filterable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attributes.map((a: any) => (
              <TableRow key={a.attribute_id}>
                <TableCell>
                  <Link to={`/admin/attributes/${a.uuid}`} className="font-medium underline-offset-2 hover:underline">
                    {a.attribute_name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{a.attribute_code}</TableCell>
                <TableCell className="text-muted-foreground">{a.type}</TableCell>
                <TableCell>
                  <Badge variant={a.is_filterable ? 'default' : 'outline'}>{a.is_filterable ? 'Yes' : 'No'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {attributes.length === 0 && <p className="mt-4 text-center text-sm text-muted-foreground">There is no attribute to display</p>}
      </CardContent>
    </Card>
  );
}
