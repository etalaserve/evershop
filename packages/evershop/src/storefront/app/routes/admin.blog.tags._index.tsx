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
  const query = select().from('blog_tag');
  if (keyword) query.where('name', 'ILIKE', `%${keyword}%`);
  query.orderBy('name', 'ASC');
  const tags = await query.execute(pool);
  return { tags, keyword };
}

export default function BlogTagGrid({ loaderData: { tags, keyword } }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <Form method="get" className="flex items-center gap-3">
          <Input type="search" name="keyword" placeholder="Search by name" defaultValue={keyword} className="max-w-xs" />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </Form>
        <Link to="/admin/blog/tags/new" className={buttonVariants({})}>
          Add tag
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL key</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((t: any) => (
              <TableRow key={t.blog_tag_id}>
                <TableCell>
                  <Link to={`/admin/blog/tags/${t.uuid}`} className="font-medium underline-offset-2 hover:underline">
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{t.url_key}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {tags.length === 0 && <p className="mt-4 text-center text-sm text-muted-foreground">There is no tag to display</p>}
      </CardContent>
    </Card>
  );
}
