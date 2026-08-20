import { select } from '@evershop/postgres-query-builder';
import { data, Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { Textarea } from '~/components/ui/textarea.js';
import updateLandingPage from '../../../modules/promotion/services/landingPage/updateLandingPage.js';
import deleteLandingPage from '../../../modules/promotion/services/landingPage/deleteLandingPage.js';
import { pool } from '../../../lib/postgres/connection.js';

function toLocalInput(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function loader({ params }: LoaderFunctionArgs) {
  const page = await select().from('landing_page').where('uuid', '=', params.uuid!).load(pool);
  if (!page) throw data('Landing page not found', { status: 404 });
  return { page };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  if (formData.get('intent') === 'delete') {
    await deleteLandingPage(params.uuid!, {});
    return redirect('/admin/landing-pages');
  }
  const publishStart = String(formData.get('publish_start') ?? '');
  const publishEnd = String(formData.get('publish_end') ?? '');
  try {
    await updateLandingPage(
      params.uuid!,
      {
        name: String(formData.get('name') ?? ''),
        url_key: String(formData.get('url_key') ?? ''),
        description: String(formData.get('description') ?? ''),
        status: formData.get('status') === 'on' ? 1 : 0,
        publish_start: publishStart ? new Date(publishStart).toISOString() : null,
        publish_end: publishEnd ? new Date(publishEnd).toISOString() : null
      },
      {}
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function LandingPageDetail({
  loaderData: { page },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { success: boolean; error?: string };
}) {
  const p = page as any;
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/landing-pages" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to landing pages
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{p.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.success && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Saved.</p>}
            {actionData && !actionData.success && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input name="name" defaultValue={p.name} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">URL key</label>
              <Input name="url_key" defaultValue={p.url_key} required />
              <p className="mt-1 text-xs text-muted-foreground">Published at /{p.url_key} — edit the page's widgets from the page builder.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Textarea name="description" defaultValue={p.description ?? ''} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Publish start</label>
                <Input type="datetime-local" name="publish_start" defaultValue={toLocalInput(p.publish_start)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Publish end</label>
                <Input type="datetime-local" name="publish_end" defaultValue={toLocalInput(p.publish_end)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked={p.status} />
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
