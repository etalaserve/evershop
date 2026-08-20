import { commit, insertOnUpdate, rollback } from '@evershop/postgres-query-builder';
import { Form, useActionData } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { currencies } from '../../../lib/locale/currencies.js';
import { timezones } from '../../../lib/locale/timezones.js';
import { getConnection } from '../../../lib/postgres/connection.js';
import { getSetting, refreshSetting } from '../../../modules/setting/services/setting.js';

/**
 * A deliberately smaller subset of the legacy StoreSetting.tsx (which also
 * covers logo/favicon/social-image uploaders, address country/province
 * cascading selects, per-store custom fields, and GA tracking) — those stay
 * on the legacy /admin/setting/store page for now, reachable via the same
 * settings nav once it exists. This covers the fields merchants touch most:
 * identity, contact, currency/timezone, language, and guest checkout.
 *
 * Reads/writes go straight through the same `setting` EAV table and
 * `getSetting`/`refreshSetting` in-memory cache every other part of
 * EverShop uses (modules/setting/services/setting.ts) — not GraphQL/REST,
 * same reasoning as the customer pages: this route already sits behind
 * admin.tsx's session guard, and it's the exact same code path
 * `saveSetting.js` uses internally.
 */
const FIELDS = [
  'storeName',
  'storeDescription',
  'storeEmail',
  'storePhoneNumber',
  'storeCurrency',
  'storeTimeZone',
  'storeLanguage',
  'adminLanguage'
] as const;

export async function loader() {
  const values = Object.fromEntries(
    await Promise.all(
      FIELDS.map(async (name) => [name, await getSetting(name, '')] as const)
    )
  );
  const allowGuestCheckout = await getSetting('allowGuestCheckout', true);
  return { values, allowGuestCheckout, currencies, timezones };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const connection = await getConnection();
  try {
    const writes = FIELDS.map((name) =>
      insertOnUpdate('setting', ['name'])
        .given({ name, value: String(formData.get(name) ?? ''), is_json: 0 })
        .execute(connection, false)
    );
    writes.push(
      insertOnUpdate('setting', ['name'])
        .given({
          name: 'allowGuestCheckout',
          value: formData.get('allowGuestCheckout') === 'on' ? '1' : '',
          is_json: 0
        })
        .execute(connection, false)
    );
    await Promise.all(writes);
    await commit(connection);
    await refreshSetting();
    return { success: true };
  } catch (err) {
    await rollback(connection);
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export default function StoreSettings({
  loaderData: { values, allowGuestCheckout, currencies, timezones }
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  const actionData = useActionData<typeof action>();

  return (
    <Form method="post" className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Store settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionData?.success && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Saved.</p>
          )}
          {actionData && !actionData.success && (
            <p className="text-sm text-destructive">{actionData.error}</p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Store name</label>
            <Input name="storeName" defaultValue={values.storeName} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Store description</label>
            <Input name="storeDescription" defaultValue={values.storeDescription} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Contact email</label>
              <Input type="email" name="storeEmail" defaultValue={values.storeEmail} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Contact phone</label>
              <Input name="storePhoneNumber" defaultValue={values.storePhoneNumber} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Currency</label>
              <select
                name="storeCurrency"
                defaultValue={values.storeCurrency}
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Timezone</label>
              <select
                name="storeTimeZone"
                defaultValue={values.storeTimeZone}
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {timezones.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Default language</label>
              <Input name="storeLanguage" defaultValue={values.storeLanguage} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Admin language</label>
              <Input name="adminLanguage" defaultValue={values.adminLanguage} required />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowGuestCheckout" defaultChecked={allowGuestCheckout} />
            Allow guest checkout
          </label>
          <div className="flex justify-end">
            <Button type="submit">Save settings</Button>
          </div>
        </CardContent>
      </Card>
    </Form>
  );
}
