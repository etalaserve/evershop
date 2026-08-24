import {
  BookOpen,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  Package,
  Receipt,
  Settings,
  Store,
  SquareStack,
  Tags,
  Users
} from 'lucide-react';
import { Link } from 'react-router';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '~/components/ui/sidebar.js';

import { NavMain, type NavMainItem } from './nav-main.js';
import { NavUser } from './nav-user.js';

const NAV_ITEMS: NavMainItem[] = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Orders', url: '/admin/orders', icon: Receipt },
  { title: 'Customers', url: '/admin/customers', icon: Users },
  {
    title: 'Catalog',
    url: '/admin/products',
    icon: Package,
    items: [
      { title: 'Products', url: '/admin/products' },
      { title: 'Categories', url: '/admin/categories' },
      { title: 'Collections', url: '/admin/collections' },
      { title: 'Attributes', url: '/admin/attributes' }
    ]
  },
  {
    title: 'Blog',
    url: '/admin/blog/posts',
    icon: BookOpen,
    items: [
      { title: 'Posts', url: '/admin/blog/posts' },
      { title: 'Categories', url: '/admin/blog/categories' },
      { title: 'Tags', url: '/admin/blog/tags' },
      { title: 'Comments', url: '/admin/blog/comments' }
    ]
  },
  { title: 'CMS pages', url: '/admin/cms/pages', icon: SquareStack },
  { title: 'Landing pages', url: '/admin/landing-pages', icon: Layers },
  { title: 'Coupons', url: '/admin/coupons', icon: Tags },
  { title: 'Page builder', url: '/admin/page-builder', icon: LayoutTemplate },
  {
    title: 'Settings',
    url: '/admin/settings/store',
    icon: Settings,
    items: [
      { title: 'Store', url: '/admin/settings/store' },
      { title: 'Tax', url: '/admin/settings/tax' },
      { title: 'Shipping', url: '/admin/settings/shipping' }
    ]
  }
];

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: { name: string; email: string } }) {
  return (
    // "icon" (not "none") is what lets the Sidebar component's own
    // useIsMobile() branch run at all — collapsible="none" short-circuits
    // before that check and unconditionally renders the fixed-width desktop
    // markup, which is why this stayed full-width and half-covered a 390px
    // viewport rather than becoming the off-canvas Sheet. There's still no
    // way to collapse it on desktop (no trigger is rendered there, so
    // `state` never leaves "expanded"), which is what "not collapsible" was
    // actually asking for — it just also needs to work on a phone.
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Store className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">EverShop</span>
                  <span className="truncate text-xs">Admin</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={NAV_ITEMS} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
