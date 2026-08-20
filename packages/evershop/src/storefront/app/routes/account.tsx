import { Link, Outlet, redirect, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';

import { customerLogout } from '~/lib/auth/client.js';
import { forwardCookieHeaders } from '~/lib/auth/session.js';
import { gql } from '~/lib/graphql/client.js';
import { CURRENT_CUSTOMER_QUERY, type CurrentCustomerResponse } from '~/lib/graphql/queries/customer.js';
import { buildMeta } from '~/lib/seo.js';

// Applies to every nested /account/* route too — none of them override meta.
export const meta: MetaFunction = () => buildMeta({ title: 'Your account', noindex: true });

export async function loader({ request }: LoaderFunctionArgs) {
  const result = await gql<CurrentCustomerResponse>(
    CURRENT_CUSTOMER_QUERY,
    undefined,
    forwardCookieHeaders(request)
  );
  if (!result.currentCustomer) {
    throw redirect(`/login?redirect=${encodeURIComponent(new URL(request.url).pathname)}`);
  }
  return { customer: result.currentCustomer };
}

const NAV = [
  { to: '/account', label: 'Profile' },
  { to: '/account/orders', label: 'Orders' },
  { to: '/account/addresses', label: 'Addresses' }
];

export default function AccountLayout() {
  const { customer } = useLoaderData<typeof loader>();

  async function handleLogout() {
    await customerLogout();
    window.location.href = '/';
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-8 px-4 py-8 md:grid-cols-4">
      <nav className="space-y-1 md:col-span-1">
        <p className="mb-3 text-sm text-muted-foreground">{customer.email}</p>
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
          >
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="block w-full rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
        >
          Sign out
        </button>
      </nav>
      <div className="md:col-span-3">
        <Outlet context={{ customer }} />
      </div>
    </div>
  );
}
