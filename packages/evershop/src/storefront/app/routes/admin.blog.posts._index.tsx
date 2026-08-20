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

const STATUS_LABELS: Record<number, string> = { 0: 'Draft', 1: 'Published', 2: 'Unpublished' };

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword') ?? '';

  const query = select().from('blog_post');
  query
    .leftJoin('blog_post_description')
    .on('blog_post.blog_post_id', '=', 'blog_post_description.blog_post_description_blog_post_id');
  if (keyword) {
    query.andWhere('blog_post_description.name', 'ILIKE', `%${keyword}%`);
  }
  query.orderBy('blog_post.created_at', 'DESC');
  const posts = await query.execute(pool);

  return { posts, keyword };
}

export default function BlogPostGrid({
  loaderData: { posts, keyword }
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
        <Link to="/admin/blog/posts/new" className={buttonVariants({})}>
          Add post
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((p: any) => (
              <TableRow key={p.blog_post_id}>
                <TableCell>
                  <Link to={`/admin/blog/posts/${p.uuid}`} className="font-medium underline-offset-2 hover:underline">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={p.status === 1 ? 'default' : 'outline'}>{STATUS_LABELS[p.status] ?? p.status}</Badge>
                </TableCell>
                <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {posts.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">There is no blog post to display</p>
        )}
      </CardContent>
    </Card>
  );
}
