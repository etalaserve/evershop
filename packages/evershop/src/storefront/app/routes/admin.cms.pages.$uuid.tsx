import { select } from '@evershop/postgres-query-builder';
import { data, Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { deletePage } from '../../../modules/cms/services/page/deletePage.js';
import updatePage from '../../../modules/cms/services/page/updatePage.js';
import { pool } from '../../../lib/postgres/connection.js';

function wrapPlainText(text: string) {
  return [
    {
      id: 'row-1',
      size: 12,
      columns: [{ id: 'col-1', size: 12, data: { blocks: [{ type: 'paragraph', data: { text } }] } }]
    }
  ];
}

/** Best-effort inverse of wrapPlainText — reads the first paragraph block's text back out for the textarea. Content built with the real block editor (multiple blocks/rows) shows only its first paragraph here; editing it re-collapses everything else. Documented limitation of this simplified page. */
function extractPlainText(content: unknown): string {
  try {
    const rows = typeof content === 'string' ? JSON.parse(content) : content;
    const text = (rows as any)?.[0]?.columns?.[0]?.data?.blocks?.[0]?.data?.text;
    return typeof text === 'string' ? text : '';
  } catch {
    return '';
  }
}

export async function loader({ params }: LoaderFunctionArgs) {
  const query = select().from('cms_page');
  query
    .leftJoin('cms_page_description')
    .on('cms_page.cms_page_id', '=', 'cms_page_description.cms_page_description_cms_page_id');
  query.where('cms_page.uuid', '=', params.uuid!);
  const page = await query.load(pool);
  if (!page) {
    throw data('Page not found', { status: 404 });
  }
  return { page, contentText: extractPlainText(page.content) };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  if (formData.get('intent') === 'delete') {
    await deletePage(params.uuid!, {});
    return redirect('/admin/cms/pages');
  }
  try {
    await updatePage(
      params.uuid!,
      {
        name: String(formData.get('name') ?? ''),
        url_key: String(formData.get('url_key') ?? ''),
        content: wrapPlainText(String(formData.get('content') ?? '')),
        status: formData.get('status') === 'on' ? 1 : 0
      },
      {}
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function CmsPageDetail({
  loaderData: { page, contentText },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { success: boolean; error?: string };
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/cms/pages" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to pages
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{page.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.success && (
              <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Saved.</p>
            )}
            {actionData && !actionData.success && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input name="name" defaultValue={page.name} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">URL key</label>
              <Input name="url_key" defaultValue={page.url_key} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Content</label>
              <textarea
                name="content"
                rows={8}
                defaultValue={contentText}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked={page.status} />
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
