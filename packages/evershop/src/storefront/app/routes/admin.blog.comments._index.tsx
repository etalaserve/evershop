import { select } from '@evershop/postgres-query-builder';
import { Form } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Badge } from '~/components/ui/badge.js';
import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table.js';
import { moderateBlogComment } from '../../../modules/blog/services/comment/moderateBlogComment.js';
import { deleteBlogComment } from '../../../modules/blog/services/comment/deleteBlogComment.js';
import { pool } from '../../../lib/postgres/connection.js';

const STATUS_VARIANT: Record<string, 'default' | 'outline' | 'destructive'> = {
  approved: 'default',
  pending: 'outline',
  spam: 'destructive'
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? '';
  // The query builder's SELECT-list can't render a `table.*` wildcard (only
  // bare `*` or a fully-qualified `table.column`), and `blog_comment` and
  // `blog_post_description` both have a `name` column — so this lists
  // `blog_comment`'s columns explicitly rather than colliding on `name`.
  const query = select();
  query.select('blog_comment.blog_comment_id');
  query.select('blog_comment.uuid');
  query.select('blog_comment.name');
  query.select('blog_comment.email');
  query.select('blog_comment.comment');
  query.select('blog_comment.status');
  query.select('blog_comment.created_at');
  query.select('blog_post_description.name', 'post_name');
  query.from('blog_comment');
  query.leftJoin('blog_post_description').on('blog_comment.post_id', '=', 'blog_post_description.blog_post_description_blog_post_id');
  if (status) query.andWhere('blog_comment.status', '=', status);
  query.orderBy('blog_comment.created_at', 'DESC');
  const comments = await query.execute(pool);
  return { comments, status };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const uuid = String(formData.get('uuid'));
  const intent = formData.get('intent');
  if (intent === 'delete') {
    await deleteBlogComment(uuid);
  } else {
    await moderateBlogComment(uuid, String(intent));
  }
  return { success: true };
}

export default function BlogCommentGrid({ loaderData: { comments, status } }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg">Comments</CardTitle>
        <Form method="get" className="flex items-center gap-2">
          <select name="status" defaultValue={status} className="h-9 rounded-md border border-input bg-background px-3 text-sm" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="spam">Spam</option>
          </select>
        </Form>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Author</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Post</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.map((c: any) => (
              <TableRow key={c.blog_comment_id}>
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{c.comment}</TableCell>
                <TableCell className="text-muted-foreground">{c.post_name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[c.status] ?? 'outline'}>{c.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {c.status !== 'approved' && (
                      <Form method="post">
                        <input type="hidden" name="uuid" value={c.uuid} />
                        <button type="submit" name="intent" value="approved" className="text-xs text-primary underline-offset-2 hover:underline">
                          Approve
                        </button>
                      </Form>
                    )}
                    {c.status !== 'spam' && (
                      <Form method="post">
                        <input type="hidden" name="uuid" value={c.uuid} />
                        <button type="submit" name="intent" value="spam" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                          Spam
                        </button>
                      </Form>
                    )}
                    <Form method="post">
                      <input type="hidden" name="uuid" value={c.uuid} />
                      <button type="submit" name="intent" value="delete" className="text-xs text-destructive underline-offset-2 hover:underline">
                        Delete
                      </button>
                    </Form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {comments.length === 0 && <p className="mt-4 text-center text-sm text-muted-foreground">There is no comment to display</p>}
      </CardContent>
    </Card>
  );
}
