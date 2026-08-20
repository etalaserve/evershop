import { insert, select } from '@evershop/postgres-query-builder';
import { data, Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { Textarea } from '~/components/ui/textarea.js';
import updateProductAttribute from '../../../modules/catalog/services/attribute/updateProductAttribute.js';
import deleteProductAttribute from '../../../modules/catalog/services/attribute/deleteProductAttribute.js';
import { pool } from '../../../lib/postgres/connection.js';

async function loadFormData(uuid: string) {
  const attribute = await select().from('attribute').where('uuid', '=', uuid).load(pool);
  if (!attribute) return null;
  const options = await select().from('attribute_option').where('attribute_id', '=', (attribute as any).attribute_id).execute(pool);
  const allGroups = await select().from('attribute_group').orderBy('group_name', 'ASC').execute(pool);
  const linkedGroupIds = (
    await select('group_id').from('attribute_group_link').where('attribute_id', '=', (attribute as any).attribute_id).execute(pool)
  ).map((r: any) => r.group_id);
  return { attribute, options, allGroups, linkedGroupIds };
}

export async function loader({ params }: LoaderFunctionArgs) {
  const result = await loadFormData(params.uuid!);
  if (!result) throw data('Attribute not found', { status: 404 });
  return result;
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    await deleteProductAttribute(params.uuid!);
    return redirect('/admin/attributes');
  }

  if (intent === 'createGroup') {
    const groupName = String(formData.get('groupName') ?? '').trim();
    if (groupName) await insert('attribute_group').given({ group_name: groupName }).execute(pool);
    return { success: true };
  }

  const type = String(formData.get('type') ?? 'text');
  const optionsText = String(formData.get('options') ?? '');
  const options =
    type === 'select' || type === 'multiselect'
      ? optionsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((option_text) => ({ option_text }))
      : undefined;

  try {
    await updateProductAttribute(params.uuid!, {
      attribute_name: String(formData.get('attribute_name') ?? ''),
      is_required: formData.get('is_required') === 'on' ? 1 : 0,
      display_on_frontend: formData.get('display_on_frontend') === 'on' ? 1 : 0,
      is_filterable: formData.get('is_filterable') === 'on' ? 1 : 0,
      sort_order: Number(formData.get('sort_order') ?? 0),
      groups: formData.getAll('groups').map(Number),
      options
    } as any);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function AttributeDetail({
  loaderData: { attribute, options, allGroups, linkedGroupIds },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { success: boolean; error?: string };
}) {
  const a = attribute as any;
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/attributes" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to attributes
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{a.attribute_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.success && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Saved.</p>}
            {actionData && !actionData.success && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input name="attribute_name" defaultValue={a.attribute_name} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Code</label>
              <Input defaultValue={a.attribute_code} disabled />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <Input defaultValue={a.type} disabled />
              <input type="hidden" name="type" value={a.type} />
            </div>
            {(a.type === 'select' || a.type === 'multiselect') && (
              <div>
                <label className="mb-1 block text-sm font-medium">Options (one per line)</label>
                <Textarea name="options" defaultValue={options.map((o: any) => o.option_text).join('\n')} rows={5} />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Sort order</label>
              <Input type="number" name="sort_order" defaultValue={a.sort_order ?? 0} min={0} />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Attribute groups</label>
              {allGroups.map((g: any) => (
                <label key={g.attribute_group_id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="groups" value={g.attribute_group_id} defaultChecked={linkedGroupIds.includes(g.attribute_group_id)} />
                  {g.group_name}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_required" defaultChecked={a.is_required} />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="display_on_frontend" defaultChecked={a.display_on_frontend} />
              Display on storefront
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_filterable" defaultChecked={a.is_filterable} />
              Filterable
            </label>
            <div className="flex items-center justify-between pt-2">
              <Button type="submit">Save</Button>
              <Button type="submit" name="intent" value="delete" variant="destructive">
                Delete
              </Button>
            </div>
          </Form>
          <Form method="post" className="mt-4 flex items-end gap-2 border-t border-border pt-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">New attribute group</label>
              <Input name="groupName" placeholder="e.g. Fabric" />
            </div>
            <Button type="submit" name="intent" value="createGroup" variant="outline">
              Add group
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
