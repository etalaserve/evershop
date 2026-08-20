import { Link } from 'react-router';

import { ProductCard } from '~/components/catalog/product-card.js';
import { RichContent, type EditorRow } from '~/components/content/rich-content.js';
import { Button } from '~/components/ui/button.js';
import type { ProductCard as ProductCardData } from '~/lib/graphql/queries/catalog.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface Extra {
  heading: string | null;
  subText: string | null;
  description: EditorRow[] | null;
  viewAllLink: string | null;
  viewAllLabel: string | null;
  products: ProductCardData[];
}

export function CollectionProducts({ widget, extra }: WidgetComponentProps) {
  const s = widget.rawSettings as { countPerRow?: number };
  const data = extra as Extra | null | undefined;
  if (!data || data.products.length === 0) return null;
  const columns = Math.min(6, Math.max(1, s.countPerRow ?? 4));

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          {data.heading && <h2 className="text-lg font-semibold">{data.heading}</h2>}
          {data.subText ? <p className="text-sm text-muted-foreground">{data.subText}</p> : <RichContent rows={data.description ?? []} />}
        </div>
        {data.viewAllLink && (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to={data.viewAllLink}>{data.viewAllLabel || 'View all'}</Link>
          </Button>
        )}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {data.products.map((product) => (
          <ProductCard key={product.productId} product={product} />
        ))}
      </div>
    </section>
  );
}
