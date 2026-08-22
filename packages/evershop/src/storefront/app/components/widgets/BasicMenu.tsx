import { Link } from 'react-router';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '~/components/ui/navigation-menu.js';
import { cn } from '~/lib/utils.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface MenuItem {
  id: string;
  name: string;
  url?: string | null;
  newTab?: boolean;
  children?: MenuItem[] | null;
}

function MenuLink({ item, linkClassName }: { item: MenuItem; linkClassName: string }) {
  if (!item.url) return <span className="px-2 text-sm">{item.name}</span>;
  const isExternal = /^https?:\/\//.test(item.url);
  return isExternal || item.newTab ? (
    <a href={item.url} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noreferrer' : undefined} className={linkClassName}>
      {item.name}
    </a>
  ) : (
    <Link to={item.url} className={linkClassName}>
      {item.name}
    </Link>
  );
}

export function BasicMenu({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as { menus?: MenuItem[]; className?: string; variant?: 'underline' | 'pill' };
  const menus = s.menus ?? [];
  if (menus.length === 0) return null;
  const isPill = s.variant === 'pill';
  const linkClassName = cn(
    'text-sm font-medium transition-colors',
    isPill ? 'rounded-full px-3 py-1.5 hover:bg-accent' : 'px-1 pb-0.5 border-b-2 border-transparent hover:border-foreground'
  );

  return (
    <NavigationMenu viewport={false} className={s.className}>
      <NavigationMenuList className="gap-4">
        {menus.map((item) =>
          item.children && item.children.length > 0 ? (
            <NavigationMenuItem key={item.id}>
              <NavigationMenuTrigger className={isPill ? 'rounded-full' : undefined}>{item.name}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-48 gap-1 p-1">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <NavigationMenuLink asChild>
                        <MenuLink item={child} linkClassName="text-sm font-medium hover:underline" />
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={item.id}>
              <MenuLink item={item} linkClassName={linkClassName} />
            </NavigationMenuItem>
          )
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
