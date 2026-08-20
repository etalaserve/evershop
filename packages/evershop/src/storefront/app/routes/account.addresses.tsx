import { useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Card, CardContent } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { createAddress, deleteAddress } from '~/lib/auth/addresses.js';
import { forwardCookieHeaders } from '~/lib/auth/session.js';
import { gql } from '~/lib/graphql/client.js';
import { CURRENT_CUSTOMER_QUERY, type CurrentCustomerResponse } from '~/lib/graphql/queries/customer.js';

export async function loader({ request }: LoaderFunctionArgs) {
  const result = await gql<CurrentCustomerResponse>(
    CURRENT_CUSTOMER_QUERY,
    undefined,
    forwardCookieHeaders(request)
  );
  return { addresses: result.currentCustomer?.addresses ?? [] };
}

const EMPTY_FORM = {
  fullName: '',
  address1: '',
  city: '',
  province: '',
  country: 'US',
  postcode: '',
  telephone: ''
};

export default function AccountAddresses() {
  const { addresses } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createAddress({
        full_name: form.fullName,
        address_1: form.address1,
        city: form.city,
        // Province codes are namespaced by country (e.g. "US-CA", not bare
        // "CA") — same format the checkout page's <select> options already
        // use (`lib/graphql/queries/customer.ts`'s PROVINCES_QUERY). A bare
        // code here resolves to nothing and renders as "INVALID_PROVINCE".
        province: form.province ? `${form.country}-${form.province}` : '',
        country: form.country,
        postcode: form.postcode,
        telephone: form.telephone
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save address');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(uuid: string) {
    await deleteAddress(uuid);
    revalidator.revalidate();
  }

  return (
    <div className="space-y-4">
      {addresses.map((address) => (
        <Card key={address.uuid}>
          <CardContent className="flex items-start justify-between p-4 text-sm">
            <div>
              <p className="font-medium">{address.fullName}</p>
              <p className="text-muted-foreground">
                {address.address1}, {address.city}, {address.province?.name} {address.postcode}
              </p>
              <p className="text-muted-foreground">{address.country?.name}</p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(address.uuid)}
              className="text-xs text-muted-foreground underline hover:text-destructive"
            >
              Remove
            </button>
          </CardContent>
        </Card>
      ))}

      {showForm ? (
        <form onSubmit={handleAdd} className="space-y-3 rounded-lg border border-border p-4">
          <Input
            placeholder="Full name"
            required
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          />
          <Input
            placeholder="Address"
            required
            value={form.address1}
            onChange={(e) => setForm((f) => ({ ...f, address1: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="City"
              required
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
            <Input
              placeholder="Postal code"
              required
              value={form.postcode}
              onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Country code (e.g. US)"
              required
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))}
            />
            <Input
              placeholder="Province/state code"
              value={form.province}
              onChange={(e) => setForm((f) => ({ ...f, province: e.target.value.toUpperCase() }))}
            />
          </div>
          <Input
            placeholder="Phone number"
            required
            value={form.telephone}
            onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save address'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          Add address
        </Button>
      )}
    </div>
  );
}
