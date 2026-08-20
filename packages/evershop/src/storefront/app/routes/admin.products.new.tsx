import { useState } from 'react';
import { Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { ImageUploader } from '~/components/admin/ImageUploader.js';
import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import createProduct from '../../../modules/catalog/services/product/createProduct.js';

/**
 * Deliberately smaller than the legacy tabbed product-edit form (which also
 * covers categories, images, attributes, related/cross-sell rules, tax
 * class, shipping package, and per-language SEO fields) — the essentials
 * only: identity, price, and stock. group_id defaults to the base attribute
 * group (1, same default the legacy customer-group save uses).
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try {
    const image = String(formData.get('image') ?? '');
    const product = await createProduct(
      {
        name: String(formData.get('name') ?? ''),
        url_key: String(formData.get('url_key') ?? ''),
        sku: String(formData.get('sku') ?? ''),
        price: Number(formData.get('price') ?? 0),
        status: formData.get('status') === 'on' ? '1' : '0',
        visibility: formData.get('visibility') === 'on' ? '1' : '0',
        group_id: 1,
        qty: Number(formData.get('qty') ?? 0),
        manage_stock: true,
        stock_availability: Number(formData.get('qty') ?? 0) > 0,
        images: image ? [image] : [],
        // Shipping-package assignment (parcel size for rate calculation)
        // isn't in this simplified form yet — mark every product exempt
        // rather than block creation on a missing package selector.
        no_shipping_required: true
      } as any,
      {}
    );
    return redirect(`/admin/products/${product.uuid}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function NewProduct({ actionData }: { actionData?: { error?: string } }) {
  const [image, setImage] = useState('');
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to products
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New product</CardTitle>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">SKU</label>
                <Input name="sku" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">URL key</label>
                <Input name="url_key" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Price</label>
                <Input type="number" step="0.01" min="0" name="price" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Quantity</label>
                <Input type="number" min="0" name="qty" defaultValue={0} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="visibility" defaultChecked />
              Visible in catalog
            </label>
            <Button type="submit">Create product</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
