import { Form, Link, Outlet, redirect, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { getCurrentAdminUser } from '~/lib/admin/session.js';
import type { AppLoadContext } from '../../../bin/lib/createStorefrontMiddleware.js';

/** Guards every /admin/* page migrated so far — mirrors the legacy `[context]auth.js` redirect-to-login behavior. */
export async function loader({ context }: LoaderFunctionArgs) {
  const user = await getCurrentAdminUser(context as AppLoadContext);
  if (!user) {
    throw redirect('/admin/login');
  }
  return { user };
}

const NAV_LINKS = [
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/collections', label: 'Collections' },
  { to: '/admin/attributes', label: 'Attributes' },
  { to: '/admin/blog/posts', label: 'Blog' },
  { to: '/admin/blog/categories', label: 'Blog categories' },
  { to: '/admin/blog/tags', label: 'Blog tags' },
  { to: '/admin/blog/comments', label: 'Comments' },
  { to: '/admin/cms/pages', label: 'CMS pages' },
  { to: '/admin/landing-pages', label: 'Landing pages' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/settings/store', label: 'Settings' },
  { to: '/admin/settings/tax', label: 'Tax' },
  { to: '/admin/settings/shipping', label: 'Shipping' },
  { to: '/admin/page-builder', label: 'Page builder' }
];

export default function AdminLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* No admin shell exists in the legacy pipeline to match yet (this is
          the first page beyond login) — same "hide the storefront chrome"
          approach as admin_.login.tsx until a real design is needed. */}
      <style>{'header, footer { display: none !important; }'}</style>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <a href="/admin" className="font-semibold">
            EverShop Admin
          </a>
          <nav className="flex flex-1 items-center gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Form method="post" action="/admin/logout">
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
              Sign out
            </button>
          </Form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
