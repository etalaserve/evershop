import { Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { Textarea } from '~/components/ui/textarea.js';
import { createBlogCategory } from '../../../modules/blog/services/category/createBlogCategory.js';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try {
    const category = await createBlogCategory({
      name: String(formData.get('name') ?? ''),
      url_key: String(formData.get('url_key') ?? ''),
      short_description: String(formData.get('short_description') ?? ''),
      status: formData.get('status') === 'on' ? 1 : 0,
      comment_policy: String(formData.get('comment_policy') ?? 'moderated')
    });
    return redirect(`/admin/blog/categories/${category.uuid}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function NewBlogCategory({ actionData }: { actionData?: { error?: string } }) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/blog/categories" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to categories
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New category</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.error && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input name="name" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">URL key</label>
              <Input name="url_key" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Short description</label>
              <Textarea name="short_description" rows={3} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Comment policy</label>
              <select name="comment_policy" defaultValue="moderated" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="open">Open</option>
                <option value="moderated">Moderated</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked />
              Enabled
            </label>
            <Button type="submit">Create category</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
