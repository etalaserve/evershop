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

  const query = select().from('cms_page');
  query
    .leftJoin('cms_page_description')
    .on('cms_page.cms_page_id', '=', 'cms_page_description.cms_page_description_cms_page_id');
  if (keyword) {
    query.andWhere('cms_page_description.name', 'ILIKE', `%${keyword}%`);
  }
  query.orderBy('cms_page.created_at', 'DESC');
  const pages = await query.execute(pool);

  return { pages, keyword };
}

export default function CmsPageGrid({
  loaderData: { pages, keyword }
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <Form method="get" className="flex items-center gap-3">
          <Input type="search" name="keyword" placeholder="Search by title" defaultValue={keyword} className="max-w-xs" />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </Form>
        <Link to="/admin/cms/pages/new" className={buttonVariants({})}>
          Add page
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>URL key</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((p: any) => (
              <TableRow key={p.cms_page_id}>
                <TableCell>
                  <Link to={`/admin/cms/pages/${p.uuid}`} className="font-medium underline-offset-2 hover:underline">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.url_key}</TableCell>
                <TableCell>
                  <Badge variant={p.status ? 'default' : 'outline'}>{p.status ? 'Enabled' : 'Disabled'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pages.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">There is no page to display</p>
        )}
      </CardContent>
    </Card>
  );
}
