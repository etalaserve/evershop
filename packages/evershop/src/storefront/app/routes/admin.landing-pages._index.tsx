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
  const query = select().from('landing_page');
  if (keyword) query.where('name', 'ILIKE', `%${keyword}%`);
  query.orderBy('created_at', 'DESC');
  const pages = await query.execute(pool);
  return { pages, keyword };
}

export default function LandingPageGrid({ loaderData: { pages, keyword } }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <Form method="get" className="flex items-center gap-3">
          <Input type="search" name="keyword" placeholder="Search by name" defaultValue={keyword} className="max-w-xs" />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </Form>
        <Link to="/admin/landing-pages/new" className={buttonVariants({})}>
          Add landing page
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
            {pages.map((p: any) => (
              <TableRow key={p.landing_page_id}>
                <TableCell>
                  <Link to={`/admin/landing-pages/${p.uuid}`} className="font-medium underline-offset-2 hover:underline">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">/{p.url_key}</TableCell>
                <TableCell>
                  <Badge variant={p.status ? 'default' : 'outline'}>{p.status ? 'Enabled' : 'Disabled'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pages.length === 0 && <p className="mt-4 text-center text-sm text-muted-foreground">There is no landing page to display</p>}
      </CardContent>
    </Card>
  );
}
