import { Link } from 'react-router';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '~/components/ui/navigation-menu.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface MenuItem {
  id: string;
  name: string;
  url?: string | null;
  newTab?: boolean;
  children?: MenuItem[] | null;
}

function MenuLink({ item }: { item: MenuItem }) {
  if (!item.url) return <span className="px-2 text-sm">{item.name}</span>;
  const isExternal = /^https?:\/\//.test(item.url);
  return isExternal || item.newTab ? (
    <a
      href={item.url}
      target={item.newTab ? '_blank' : undefined}
      rel={item.newTab ? 'noreferrer' : undefined}
      className="text-sm font-medium hover:underline"
    >
      {item.name}
    </a>
  ) : (
    <Link to={item.url} className="text-sm font-medium hover:underline">
      {item.name}
    </Link>
  );
}

export function BasicMenu({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as { menus?: MenuItem[]; className?: string };
  const menus = s.menus ?? [];
  if (menus.length === 0) return null;

  return (
    <NavigationMenu viewport={false} className={s.className}>
      <NavigationMenuList className="gap-4">
        {menus.map((item) =>
          item.children && item.children.length > 0 ? (
            <NavigationMenuItem key={item.id}>
              <NavigationMenuTrigger>{item.name}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-48 gap-1 p-1">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <NavigationMenuLink asChild>
                        <MenuLink item={child} />
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={item.id}>
              <MenuLink item={item} />
            </NavigationMenuItem>
          )
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
