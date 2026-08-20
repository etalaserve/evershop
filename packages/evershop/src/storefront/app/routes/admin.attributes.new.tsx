import { select } from '@evershop/postgres-query-builder';
import { Form, Link, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { Textarea } from '~/components/ui/textarea.js';
import createProductAttribute from '../../../modules/catalog/services/attribute/createProductAttribute.js';
import { pool } from '../../../lib/postgres/connection.js';

export async function loader(_args: LoaderFunctionArgs) {
  const allGroups = await select().from('attribute_group').orderBy('group_name', 'ASC').execute(pool);
  return { allGroups };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
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
    const attribute = await createProductAttribute({
      attribute_code: String(formData.get('attribute_code') ?? ''),
      attribute_name: String(formData.get('attribute_name') ?? ''),
      type,
      is_required: formData.get('is_required') === 'on' ? 1 : 0,
      display_on_frontend: formData.get('display_on_frontend') === 'on' ? 1 : 0,
      is_filterable: formData.get('is_filterable') === 'on' ? 1 : 0,
      groups: formData.getAll('groups').map(Number),
      options
    } as any);
    return redirect(`/admin/attributes/${attribute.uuid}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function NewAttribute({
  loaderData: { allGroups },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { error?: string };
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/admin/attributes" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to attributes
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New attribute</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.error && <p className="text-sm text-destructive">{actionData.error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input name="attribute_name" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Code</label>
              <Input name="attribute_code" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select name="type" defaultValue="text" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="text">Text</option>
                <option value="textarea">Textarea</option>
                <option value="select">Select</option>
                <option value="multiselect">Multiselect</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Options (one per line, for select/multiselect)</label>
              <Textarea name="options" rows={4} />
            </div>
            {allGroups.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Attribute groups</label>
                {allGroups.map((g: any) => (
                  <label key={g.attribute_group_id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="groups" value={g.attribute_group_id} />
                    {g.group_name}
                  </label>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_required" />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="display_on_frontend" />
              Display on storefront
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_filterable" />
              Filterable
            </label>
            <Button type="submit">Create attribute</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
