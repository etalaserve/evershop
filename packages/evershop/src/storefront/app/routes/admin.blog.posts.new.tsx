import { Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { createBlogPost } from '../../../modules/blog/services/post/createBlogPost.js';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try {
    const post = await createBlogPost(
      {
        name: String(formData.get('name') ?? ''),
        url_key: String(formData.get('url_key') ?? ''),
        short_description: String(formData.get('short_description') ?? ''),
        status: formData.get('status') === 'on' ? 1 : 0
      },
      {}
    );
    return redirect(`/admin/blog/posts/${post.uuid}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function NewBlogPost({ actionData }: { actionData?: { error?: string } }) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/blog/posts" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to posts
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New blog post</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.error && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input name="name" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">URL key</label>
              <Input name="url_key" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Short description</label>
              <textarea
                name="short_description"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" />
              Published
            </label>
            <Button type="submit">Create post</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
