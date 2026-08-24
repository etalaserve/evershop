import { Outlet, redirect, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { AppSidebar } from '~/components/admin/app-sidebar.js';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar.js';
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
          {/* The sidebar is now an off-canvas Sheet below md (see
              app-sidebar.tsx) instead of a fixed panel, which means mobile
              needs some way to open it — this is that. Hidden at md and up,
              where the sidebar is always visible and there's nothing to
              trigger. */}
          <div className="flex items-center gap-2 border-b p-4 md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-medium">EverShop Admin</span>
          </div>
          <main className="p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
