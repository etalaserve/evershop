import { Search, ShoppingCart, User } from 'lucide-react';
import { Link } from 'react-router';

import { Input } from '~/components/ui/input.js';

export interface NavCategory {
  categoryId: number;
  name: string;
  urlKey: string;
}

export function Header({
  storeName,
  categories
}: {
  storeName: string;
  categories: NavCategory[];
}) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
        <Link to="/" className="shrink-0 text-lg font-semibold">
          {storeName}
        </Link>
        <nav className="hidden items-center gap-4 md:flex">
          {categories.map((category) => (
            <Link
              key={category.categoryId}
              to={`/category/${category.urlKey}`}
              prefetch="intent"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {category.name}
            </Link>
          ))}
          <Link to="/blog" prefetch="intent" className="text-sm text-muted-foreground hover:text-foreground">
            Blog
          </Link>
        </nav>
        <form action="/search" method="get" className="ml-auto flex max-w-xs flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" placeholder="Search products" className="pl-8" />
          </div>
        </form>
        <Link to="/account" aria-label="Account" className="shrink-0 text-foreground">
          <User className="h-5 w-5" />
        </Link>
        <Link to="/cart" aria-label="Cart" className="shrink-0 text-foreground">
          <ShoppingCart className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
