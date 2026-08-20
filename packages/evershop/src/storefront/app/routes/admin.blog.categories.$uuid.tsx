import { select } from '@evershop/postgres-query-builder';
import { data, Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { Textarea } from '~/components/ui/textarea.js';
import { updateBlogCategory } from '../../../modules/blog/services/category/updateBlogCategory.js';
import { deleteBlogCategory } from '../../../modules/blog/services/category/deleteBlogCategory.js';
import { pool } from '../../../lib/postgres/connection.js';

export async function loader({ params }: LoaderFunctionArgs) {
  const query = select().from('blog_category');
  query.leftJoin('blog_category_description').on('blog_category.blog_category_id', '=', 'blog_category_description.blog_category_description_blog_category_id');
  query.where('blog_category.uuid', '=', params.uuid!);
  const category = await query.load(pool);
  if (!category) throw data('Category not found', { status: 404 });
  return { category };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  if (formData.get('intent') === 'delete') {
    await deleteBlogCategory(params.uuid!);
    return redirect('/admin/blog/categories');
  }
  try {
    await updateBlogCategory(params.uuid!, {
      name: String(formData.get('name') ?? ''),
      url_key: String(formData.get('url_key') ?? ''),
      short_description: String(formData.get('short_description') ?? ''),
      status: formData.get('status') === 'on' ? 1 : 0,
      comment_policy: String(formData.get('comment_policy') ?? 'moderated')
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function BlogCategoryDetail({
  loaderData: { category },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { success: boolean; error?: string };
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/blog/categories" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to categories
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{category.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.success && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Saved.</p>}
            {actionData && !actionData.success && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input name="name" defaultValue={category.name} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">URL key</label>
              <Input name="url_key" defaultValue={category.url_key} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Short description</label>
              <Textarea name="short_description" defaultValue={category.short_description ?? ''} rows={3} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Comment policy</label>
              <select name="comment_policy" defaultValue={category.comment_policy} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="open">Open</option>
                <option value="moderated">Moderated</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked={category.status} />
              Enabled
            </label>
            <div className="flex items-center justify-between pt-2">
              <Button type="submit">Save</Button>
              <Button type="submit" name="intent" value="delete" variant="destructive">
                Delete
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
