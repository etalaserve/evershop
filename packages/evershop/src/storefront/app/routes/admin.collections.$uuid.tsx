import { del, insertOnUpdate, select } from '@evershop/postgres-query-builder';
import { data, Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table.js';
import updateCollection from '../../../modules/catalog/services/collection/updateCollection.js';
import deleteCollection from '../../../modules/catalog/services/collection/deleteCollection.js';
import { pool } from '../../../lib/postgres/connection.js';

export async function loader({ params }: LoaderFunctionArgs) {
  const collection = await select().from('collection').where('uuid', '=', params.uuid!).load(pool);
  if (!collection) throw data('Collection not found', { status: 404 });

  const productsQuery = select();
  productsQuery.select('product.product_id');
  productsQuery.select('product.uuid');
  productsQuery.select('product.sku');
  productsQuery.select('product_description.name');
  productsQuery.from('product_collection');
  productsQuery.innerJoin('product').on('product_collection.product_id', '=', 'product.product_id');
  productsQuery.leftJoin('product_description').on('product.product_id', '=', 'product_description.product_description_product_id');
  productsQuery.where('product_collection.collection_id', '=', collection.collection_id);
  const products = await productsQuery.execute(pool);

  return { collection, products };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    await deleteCollection(params.uuid!);
    return redirect('/admin/collections');
  }

  if (intent === 'addProduct') {
    const sku = String(formData.get('sku') ?? '').trim();
    const collection = await select().from('collection').where('uuid', '=', params.uuid!).load(pool);
    const product = await select().from('product').where('sku', '=', sku).load(pool);
    if (!product) return { success: false, error: `No product with SKU "${sku}"` };
    await insertOnUpdate('product_collection', ['collection_id', 'product_id'])
      .given({ collection_id: (collection as any).collection_id, product_id: (product as any).product_id })
      .execute(pool);
    return { success: true };
  }

  if (intent === 'removeProduct') {
    const collection = await select().from('collection').where('uuid', '=', params.uuid!).load(pool);
    const productId = Number(formData.get('productId'));
    await del('product_collection')
      .where('collection_id', '=', (collection as any).collection_id)
      .and('product_id', '=', productId)
      .execute(pool);
    return { success: true };
  }

  try {
    await updateCollection(params.uuid!, {
      name: String(formData.get('name') ?? ''),
      code: String(formData.get('code') ?? ''),
      description: String(formData.get('description') ?? '')
    } as any);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function CollectionDetail({
  loaderData: { collection, products },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { success: boolean; error?: string };
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/collections" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to collections
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{collection.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.success && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Saved.</p>}
            {actionData && !actionData.success && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input name="name" defaultValue={collection.name} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Code</label>
              <Input name="code" defaultValue={collection.code} pattern="^[a-zA-Z0-9_-]+$" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Input name="description" defaultValue={collection.description ?? ''} />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button type="submit">Save</Button>
              <Button type="submit" name="intent" value="delete" variant="destructive">
                Delete
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p: any) => (
                <TableRow key={p.product_id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="text-right">
                    <Form method="post">
                      <input type="hidden" name="productId" value={p.product_id} />
                      <button type="submit" name="intent" value="removeProduct" className="text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-destructive">
                        Remove
                      </button>
                    </Form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {products.length === 0 && <p className="text-sm text-muted-foreground">No products in this collection yet</p>}
          <Form method="post" className="flex items-end gap-2 border-t border-border pt-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Add product by SKU</label>
              <Input name="sku" placeholder="SKU" required />
            </div>
            <Button type="submit" name="intent" value="addProduct" variant="outline">
              Add
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
