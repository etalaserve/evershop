import { useState } from 'react';
import { Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { ImageUploader } from '~/components/admin/ImageUploader.js';
import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import createCategory from '../../../modules/catalog/services/category/createCategory.js';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try {
    const category = await createCategory(
      {
        name: String(formData.get('name') ?? ''),
        url_key: String(formData.get('url_key') ?? ''),
        image: String(formData.get('image') ?? ''),
        status: formData.get('status') === 'on' ? 1 : 0
      } as any,
      {}
    );
    return redirect(`/admin/categories/${category.uuid}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function NewCategory({ actionData }: { actionData?: { error?: string } }) {
  const [image, setImage] = useState('');
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/categories" className="text-sm text-muted-foreground hover:text-foreground">
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
              <label className="mb-1 block text-sm font-medium">Image</label>
              <input type="hidden" name="image" value={image} />
              <ImageUploader value={image} onChange={setImage} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input name="name" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">URL key</label>
              <Input name="url_key" required />
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
