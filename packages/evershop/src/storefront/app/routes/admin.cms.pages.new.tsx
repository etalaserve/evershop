import { Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { createPage } from '../../../modules/cms/services/page/createPage.js';

/** Plain-paragraph EditorJS row/column/blocks shape — see storefront's own rich-content.tsx for the same wrap-plain-text pattern. Full block editing is future work. */
function wrapPlainText(text: string) {
  return [
    {
      id: 'row-1',
      size: 12,
      columns: [{ id: 'col-1', size: 12, data: { blocks: [{ type: 'paragraph', data: { text } }] } }]
    }
  ];
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try {
    const page = await createPage(
      {
        name: String(formData.get('name') ?? ''),
        url_key: String(formData.get('url_key') ?? ''),
        content: wrapPlainText(String(formData.get('content') ?? '')),
        meta_title: String(formData.get('name') ?? ''),
        status: formData.get('status') === 'on' ? 1 : 0
      },
      {}
    );
    return redirect(`/admin/cms/pages/${page.uuid}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function NewCmsPage({ actionData }: { actionData?: { error?: string } }) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/cms/pages" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to pages
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New page</CardTitle>
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
              <label className="mb-1 block text-sm font-medium">Content</label>
              <textarea
                name="content"
                rows={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked />
              Enabled
            </label>
            <Button type="submit">Create page</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
