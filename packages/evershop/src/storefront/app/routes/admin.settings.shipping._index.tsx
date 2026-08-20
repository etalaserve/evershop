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
 * Zones (name + which countries they cover) only — per-provider shipping
 * rates/methods and packages are a separate, considerably more involved
 * feature (rate tables keyed by provider, weight/price brackets) left on
 * the legacy /admin/setting/shipping page for now. This is enough to
 * define WHERE you ship; rate configuration for each zone still needs the
 * legacy page until that's ported too.
 */
export async function loader() {
  const zones = await select().from('shipping_zone').orderBy('name', 'ASC').execute(pool);
  const withCountries = await Promise.all(
    zones.map(async (z: any) => {
      const countries = await select('country')
        .from('shipping_zone_country')
        .where('zone_id', '=', z.shipping_zone_id)
        .execute(pool);
      return { ...z, countries: countries.map((c: any) => c.country) };
    })
  );
  return { zones: withCountries };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  if (formData.get('intent') === 'delete') {
    await pool.query('DELETE FROM shipping_zone WHERE uuid = $1', [formData.get('uuid')]);
    return { success: true };
  }
  const name = String(formData.get('name') ?? '').trim();
  const countriesRaw = String(formData.get('countries') ?? '');
  const countries = countriesRaw
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  if (!name || countries.length === 0) {
    return { success: false, error: 'Name and at least one country code are required' };
  }
  try {
    const zone = await insert('shipping_zone').given({ name }).execute(pool);
    await Promise.all(
      countries.map((country) =>
        insert('shipping_zone_country')
          .given({ zone_id: zone.insertId, country })
          .execute(pool)
      )
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function ShippingSettings({
  loaderData: { zones },
  actionData
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { success: boolean; error?: string };
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shipping zones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionData && !actionData.success && <p className="text-sm text-destructive">{actionData.error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Countries</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((z: any) => (
                <TableRow key={z.shipping_zone_id}>
                  <TableCell>{z.name}</TableCell>
                  <TableCell className="text-muted-foreground">{z.countries.join(', ')}</TableCell>
                  <TableCell className="text-right">
                    <Form method="post">
                      <input type="hidden" name="uuid" value={z.uuid} />
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
          {zones.length === 0 && (
            <p className="text-sm text-muted-foreground">There is no shipping zone to display</p>
          )}
          <Form method="post" className="space-y-3 border-t border-border pt-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Zone name</label>
              <Input name="name" placeholder="e.g. Indonesia" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Country codes (comma-separated)</label>
              <Input name="countries" placeholder="ID" required />
            </div>
            <Button type="submit">Add zone</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
