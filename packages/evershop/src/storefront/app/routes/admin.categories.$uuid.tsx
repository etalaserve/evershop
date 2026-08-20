import { select } from '@evershop/postgres-query-builder';
import { useState } from 'react';
import { data, Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { ImageUploader } from '~/components/admin/ImageUploader.js';
import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import updateCategory from '../../../modules/catalog/services/category/updateCategory.js';
import deleteCategory from '../../../modules/catalog/services/category/deleteCategory.js';
import { pool } from '../../../lib/postgres/connection.js';

export async function loader({ params }: LoaderFunctionArgs) {
  const query = select().from('category');
  query
    .leftJoin('category_description')
    .on('category.category_id', '=', 'category_description.category_description_category_id');
  query.where('category.uuid', '=', params.uuid!);
  const category = await query.load(pool);
  if (!category) {
    throw data('Category not found', { status: 404 });
  }
  return { category };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');
  if (intent === 'delete') {
    await deleteCategory(params.uuid!, {});
    return redirect('/admin/categories');
  }
  try {
    await updateCategory(
      params.uuid!,
      {
        name: String(formData.get('name') ?? ''),
        url_key: String(formData.get('url_key') ?? ''),
        image: String(formData.get('image') ?? ''),
        status: formData.get('status') === 'on' ? 1 : 0
      } as any,
      {}
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function CategoryDetail({
  loaderData: { category },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { success: boolean; error?: string };
}) {
  const [image, setImage] = useState(category.image ?? '');
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/categories" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to categories
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{category.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.success && (
              <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Saved.</p>
            )}
            {actionData && !actionData.success && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Image</label>
              <input type="hidden" name="image" value={image} />
              <ImageUploader value={image} onChange={setImage} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input name="name" defaultValue={category.name} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">URL key</label>
              <Input name="url_key" defaultValue={category.url_key} required />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked={category.status} />
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
