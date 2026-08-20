import { select } from '@evershop/postgres-query-builder';
import { data, Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { updateBlogTag } from '../../../modules/blog/services/tag/updateBlogTag.js';
import { deleteBlogTag } from '../../../modules/blog/services/tag/deleteBlogTag.js';
import { pool } from '../../../lib/postgres/connection.js';

export async function loader({ params }: LoaderFunctionArgs) {
  const tag = await select().from('blog_tag').where('uuid', '=', params.uuid!).load(pool);
  if (!tag) throw data('Tag not found', { status: 404 });
  return { tag };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  if (formData.get('intent') === 'delete') {
    await deleteBlogTag(params.uuid!);
    return redirect('/admin/blog/tags');
  }
  try {
    await updateBlogTag(params.uuid!, {
      name: String(formData.get('name') ?? ''),
      url_key: String(formData.get('url_key') ?? '')
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function BlogTagDetail({
  loaderData: { tag },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { success: boolean; error?: string };
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/blog/tags" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to tags
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tag.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.success && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Saved.</p>}
            {actionData && !actionData.success && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input name="name" defaultValue={tag.name} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">URL key</label>
              <Input name="url_key" defaultValue={tag.url_key} required />
            </div>
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
