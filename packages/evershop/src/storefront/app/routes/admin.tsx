import { Outlet, redirect, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { AppSidebar } from '~/components/admin/app-sidebar.js';
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar.js';
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

export default function AdminLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="[--sidebar-width:16rem]">
      {/* No admin shell exists in the legacy pipeline to match yet (this is
          the first page beyond login) — same "hide the storefront chrome"
          approach as admin_.login.tsx until a real design is needed. */}
      <style>{'header, footer { display: none !important; }'}</style>
      <SidebarProvider defaultOpen className="min-h-screen">
        <AppSidebar user={{ name: user.full_name, email: user.email }} className="h-screen border-r border-sidebar-border" />
        <SidebarInset>
          <main className="p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
