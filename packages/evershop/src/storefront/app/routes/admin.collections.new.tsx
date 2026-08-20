import { Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import createCollection from '../../../modules/catalog/services/collection/createCollection.js';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try {
    const collection = await createCollection({
      name: String(formData.get('name') ?? ''),
      code: String(formData.get('code') ?? ''),
      description: String(formData.get('description') ?? '')
    } as any);
    return redirect(`/admin/collections/${collection.uuid}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function NewCollection({ actionData }: { actionData?: { error?: string } }) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/collections" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to collections
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New collection</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.error && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input name="name" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Code</label>
              <Input name="code" pattern="^[a-zA-Z0-9_-]+$" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Input name="description" />
            </div>
            <Button type="submit">Create collection</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
