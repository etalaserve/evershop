import { Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { Textarea } from '~/components/ui/textarea.js';
import createLandingPage from '../../../modules/promotion/services/landingPage/createLandingPage.js';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try {
    const page = await createLandingPage(
      {
        name: String(formData.get('name') ?? ''),
        url_key: String(formData.get('url_key') ?? ''),
        description: String(formData.get('description') ?? ''),
        status: formData.get('status') === 'on' ? 1 : 0
      },
      {}
    );
    return redirect(`/admin/landing-pages/${page.uuid}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function NewLandingPage({ actionData }: { actionData?: { error?: string } }) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/landing-pages" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to landing pages
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New landing page</CardTitle>
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
              <Input name="url_key" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Textarea name="description" rows={3} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked />
              Enabled
            </label>
            <Button type="submit">Create landing page</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
