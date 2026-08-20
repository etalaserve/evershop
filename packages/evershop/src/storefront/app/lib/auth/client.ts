import { toEvershopUrl } from '~/lib/image.js';

/**
 * Unlike cart (see `lib/cart/session.ts`), customer login IS a real EverShop
 * session cookie — `POST /customer/login` is a `pages/frontStore/` route,
 * which (unlike `api/*`) has express-session attached, so it genuinely sets
 * `Set-Cookie` on success. `credentials: 'include'` is required cross-origin
 * so the browser stores it and sends it back on later requests; EverShop's
 * CORS config must allow this storefront's origin with credentials for that
 * to work (a deployment-time step — see the storefront README).
 */
async function parseOrThrow(res: Response): Promise<any> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new Error(body?.error?.message ?? 'Something went wrong');
  }
  return body.data;
}

export async function customerLogin(email: string, password: string): Promise<void> {
  const res = await fetch(toEvershopUrl('/customer/login'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  await parseOrThrow(res);
}

export async function customerLogout(): Promise<void> {
  await fetch(toEvershopUrl('/customer/logout'), {
    method: 'POST',
    credentials: 'include'
  });
}

export async function customerRegister(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<void> {
  const res = await fetch(toEvershopUrl('/api/customers'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      full_name: input.fullName
    })
  });
  await parseOrThrow(res);
  // createCustomer doesn't log the new account in — do it explicitly so
  // registration lands the shopper in a logged-in state, matching typical
  // storefront UX.
  await customerLogin(input.email, input.password);
}
