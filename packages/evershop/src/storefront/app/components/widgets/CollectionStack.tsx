import { Link } from 'react-router';

import { ProductCard } from '~/components/catalog/product-card.js';
import { Button } from '~/components/ui/button.js';
import { Separator } from '~/components/ui/separator.js';
import type { ProductCard as ProductCardData } from '~/lib/graphql/queries/catalog.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

import { ProductRail } from './ProductRail.js';

interface Row {
  id: string;
  title: string;
  subText: string | null;
  viewAllLink: string | null;
  viewAllLabel: string | null;
  products: ProductCardData[];
}

export function CollectionStack({ widget, extra }: WidgetComponentProps) {
  const s = widget.rawSettings as { variant?: 'grid' | 'carousel' };
  const data = extra as { rows: Row[]; countPerRow: number; divider: boolean } | null | undefined;
  const rows = (data?.rows ?? []).filter((r) => r.products.length > 0);
  if (rows.length === 0) return null;
  const columns = Math.min(6, Math.max(2, data?.countPerRow ?? 4));
  const isCarousel = s.variant === 'carousel';

  return (
    <div className="space-y-8">
      {rows.map((row, i) => (
        <section key={row.id} className="space-y-4">
          {i > 0 && data?.divider && <Separator className="mb-4" />}
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">{row.title}</h2>
              {row.subText && <p className="text-sm text-muted-foreground">{row.subText}</p>}
            </div>
            {row.viewAllLink && (
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link to={row.viewAllLink}>{row.viewAllLabel || 'View all'}</Link>
              </Button>
            )}
          </div>
          {isCarousel ? (
            <ProductRail products={row.products} columns={columns} />
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {row.products.map((product) => (
                <ProductCard key={product.productId} product={product} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
