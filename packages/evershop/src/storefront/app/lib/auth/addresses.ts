import { toEvershopUrl } from '~/lib/image.js';

/**
 * `/api/customers/me/addresses` DOES resolve the authenticated customer from
 * the forwarded session cookie (global `getCurrentCustomer[auth]` middleware
 * applies to all `api/*` routes) — unlike cart's session-based endpoints,
 * this one isn't broken for a headless client, since the customer already
 * has a real EverShop session cookie from `customer/login`.
 */
export interface AddressInput {
  full_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province: string;
  country: string;
  postcode: string;
  telephone: string;
}

async function parseOrThrow(res: Response): Promise<any> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new Error(body?.error?.message ?? 'Something went wrong');
  }
  return body.data;
}

export async function createAddress(input: AddressInput): Promise<void> {
  const res = await fetch(toEvershopUrl('/api/customers/me/addresses'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  await parseOrThrow(res);
}

export async function deleteAddress(uuid: string): Promise<void> {
  const res = await fetch(toEvershopUrl(`/api/customers/me/addresses/${uuid}`), {
    method: 'DELETE',
    credentials: 'include'
  });
  await parseOrThrow(res);
}
