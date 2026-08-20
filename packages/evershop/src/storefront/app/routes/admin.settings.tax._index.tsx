import { insert, select } from '@evershop/postgres-query-builder';
import { Form } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '~/components/ui/table.js';
import { pool } from '../../../lib/postgres/connection.js';

/**
 * Tax classes only — rates/zones (which class applies what percent, where)
 * are a separate, more involved feature (country/province-scoped rate
 * rules) left for a later pass. Classes are just named buckets products
 * point at via `product.tax_class`, so this alone is enough to let a
 * product reference a real tax class instead of none.
 */
export async function loader() {
  const classes = await select().from('tax_class').orderBy('name', 'ASC').execute(pool);
  return { classes };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');
  if (intent === 'delete') {
    await pool.query('DELETE FROM tax_class WHERE uuid = $1', [formData.get('uuid')]);
    return { success: true };
  }
  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return { success: false, error: 'Name is required' };
  }
  try {
    await insert('tax_class').given({ name }).execute(pool);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function TaxSettings({
  loaderData: { classes },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { success: boolean; error?: string };
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tax classes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionData && !actionData.success && <p className="text-sm text-destructive">{actionData.error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((c: any) => (
                <TableRow key={c.tax_class_id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="text-right">
                    <Form method="post">
                      <input type="hidden" name="uuid" value={c.uuid} />
                      <button
                        type="submit"
                        name="intent"
                        value="delete"
                        className="text-xs text-muted-foreground underline hover:text-destructive"
                      >
                        Delete
                      </button>
                    </Form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {classes.length === 0 && (
            <p className="text-sm text-muted-foreground">There is no tax class to display</p>
          )}
          <Form method="post" className="flex items-end gap-3 border-t border-border pt-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">New tax class name</label>
              <Input name="name" placeholder="e.g. Standard" required />
            </div>
            <Button type="submit">Add</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
