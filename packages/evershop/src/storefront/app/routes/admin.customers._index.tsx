import { select } from '@evershop/postgres-query-builder';
import { Form, Link, useSearchParams } from 'react-router';
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

const PAGE_SIZE = 20;

/**
 * Direct DB read (same pattern as lib/admin/session.ts), not GraphQL/REST —
 * `/api/graphql`'s per-route compiled-query mechanism doesn't apply outside
 * the legacy Area pipeline, and the legacy REST endpoints are thin wrappers
 * around exactly this kind of query anyway. Mirrors customerGrid's query
 * (same fields, same default sort) without porting buildFilterFromUrl's
 * generic filter system — keyword search + status filter + pagination is
 * everything the legacy grid actually exposed.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const keyword = url.searchParams.get('keyword') ?? '';
  const status = url.searchParams.get('status') ?? '';

  const query = select().from('customer');
  if (keyword) {
    query.andWhere('full_name', 'ILIKE', `%${keyword}%`);
  }
  if (status === '0' || status === '1') {
    query.andWhere('status', '=', Number(status));
  }
  query.orderBy('created_at', 'DESC');
  query.limit((page - 1) * PAGE_SIZE, PAGE_SIZE);
  const customers = await query.execute(pool);

  const countQuery = select().from('customer');
  if (keyword) {
    countQuery.andWhere('full_name', 'ILIKE', `%${keyword}%`);
  }
  if (status === '0' || status === '1') {
    countQuery.andWhere('status', '=', Number(status));
  }
  const countRows = await countQuery.execute(pool);

  return { customers, total: countRows.length, page, keyword, status };
}

export default function CustomerGrid({
  loaderData: { customers, total, page, keyword, status }
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  const [, setSearchParams] = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card>
      <CardHeader>
        <Form method="get" className="flex items-center gap-3">
          <Input
            type="search"
            name="keyword"
            placeholder="Search by name"
            defaultValue={keyword}
            className="max-w-xs"
          />
          <select
            name="status"
            defaultValue={status}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="1">Enabled</option>
            <option value="0">Disabled</option>
          </select>
          <Button type="submit" variant="outline">
            Filter
          </Button>
          {(keyword || status) && (
            <Button type="button" variant="link" onClick={() => setSearchParams({})}>
              Clear
            </Button>
          )}
        </Form>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c: any) => (
              <TableRow key={c.customer_id}>
                <TableCell>
                  <Link to={`/admin/customers/${c.uuid}`} className="font-medium underline-offset-2 hover:underline">
                    {c.full_name}
                  </Link>
                </TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>
                  <Badge variant={c.status ? 'default' : 'outline'}>
                    {c.status ? 'Enabled' : 'Disabled'}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {customers.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            There is no customer to display
          </p>
        )}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
