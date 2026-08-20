import { Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { createBlogTag } from '../../../modules/blog/services/tag/createBlogTag.js';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try {
    const tag = await createBlogTag({
      name: String(formData.get('name') ?? ''),
      url_key: String(formData.get('url_key') ?? '')
    });
    return redirect(`/admin/blog/tags/${tag.uuid}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function NewBlogTag({ actionData }: { actionData?: { error?: string } }) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/blog/tags" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to tags
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New tag</CardTitle>
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
            <Button type="submit">Create tag</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
