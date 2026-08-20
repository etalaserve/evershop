import { select } from '@evershop/postgres-query-builder';
import { useState } from 'react';
import { data, Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { ImageUploader } from '~/components/admin/ImageUploader.js';
import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import deleteProduct from '../../../modules/catalog/services/product/deleteProduct.js';
import updateProduct from '../../../modules/catalog/services/product/updateProduct.js';
import { pool } from '../../../lib/postgres/connection.js';

export async function loader({ params }: LoaderFunctionArgs) {
  const query = select().from('product');
  query
    .leftJoin('product_description')
    .on('product.product_id', '=', 'product_description.product_description_product_id');
  query
    .leftJoin('product_inventory')
    .on('product.product_id', '=', 'product_inventory.product_inventory_product_id');
  query.where('product.uuid', '=', params.uuid!);
  const product = await query.load(pool);
  if (!product) {
    throw data('Product not found', { status: 404 });
  }
  const mainImage = await select('origin_image')
    .from('product_image')
    .where('product_image_product_id', '=', (product as any).product_id)
    .and('is_main', '=', true)
    .load(pool);
  return { product, image: (mainImage as any)?.origin_image ?? '' };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');
  if (intent === 'delete') {
    await deleteProduct(params.uuid!, {});
    return redirect('/admin/products');
  }
  try {
    const qty = Number(formData.get('qty') ?? 0);
    await updateProduct(
      params.uuid!,
      {
        name: String(formData.get('name') ?? ''),
        url_key: String(formData.get('url_key') ?? ''),
        sku: String(formData.get('sku') ?? ''),
        price: Number(formData.get('price') ?? 0),
        status: formData.get('status') === 'on' ? '1' : '0',
        visibility: formData.get('visibility') === 'on' ? '1' : '0',
        images: (() => {
          const image = String(formData.get('image') ?? '');
          return image ? [image] : [];
        })(),
        qty,
        manage_stock: true,
        stock_availability: qty > 0
      } as any,
      {}
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function ProductDetail({
  loaderData: { product, image: initialImage },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { success: boolean; error?: string };
}) {
  const [image, setImage] = useState(initialImage);
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to products
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{product.name}</CardTitle>
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
              <Input name="name" defaultValue={product.name} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">SKU</label>
                <Input name="sku" defaultValue={product.sku} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">URL key</label>
                <Input name="url_key" defaultValue={product.url_key} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Price</label>
                <Input type="number" step="0.01" min="0" name="price" defaultValue={product.price} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Quantity</label>
                <Input type="number" min="0" name="qty" defaultValue={product.qty ?? 0} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked={product.status} />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="visibility" defaultChecked={product.visibility} />
              Visible in catalog
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
