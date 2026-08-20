import { select } from '@evershop/postgres-query-builder';
import { Form, Link } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { Button, buttonVariants } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table.js';
import { pool } from '../../../lib/postgres/connection.js';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword') ?? '';
  const query = select().from('collection');
  if (keyword) query.where('name', 'ILIKE', `%${keyword}%`);
  query.orderBy('name', 'ASC');
  const collections = await query.execute(pool);
  return { collections, keyword };
}

export default function CollectionGrid({ loaderData: { collections, keyword } }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <Form method="get" className="flex items-center gap-3">
          <Input type="search" name="keyword" placeholder="Search by name" defaultValue={keyword} className="max-w-xs" />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </Form>
        <Link to="/admin/collections/new" className={buttonVariants({})}>
          Add collection
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.map((c: any) => (
              <TableRow key={c.collection_id}>
                <TableCell>
                  <Link to={`/admin/collections/${c.uuid}`} className="font-medium underline-offset-2 hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.code}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {collections.length === 0 && <p className="mt-4 text-center text-sm text-muted-foreground">There is no collection to display</p>}
      </CardContent>
    </Card>
  );
}
