import { ProductCard } from '~/components/catalog/product-card.js';
import type { ProductCard as ProductCardData } from '~/lib/graphql/queries/catalog.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

import { ProductRail } from './ProductRail.js';

/**
 * Shared shelf for the 4 recommendation widget types — `related_products`,
 * `frequently_bought_together`, `upsell_products` (all anchored to "the
 * current product", data merged in by the product page's loader via
 * `mergeProductAnchorExtras`) and `cart_frequently_bought_together`
 * (anchored to the visitor's cart, resolved by `resolveWidgetExtras`).
 * They share one legacy component (`RecommendationShelf.tsx`) and the same
 * `{heading, limit, variant}` settings shape — same here, just 4 registry
 * entries. Renders nothing off their anchor page (e.g. `related_products`
 * placed on the homepage has no current product) or when the resolver
 * found nothing.
 */
export function RecommendationShelf({ widget, extra }: WidgetComponentProps) {
  const s = widget.rawSettings as { heading?: string | null; variant?: 'grid' | 'carousel' };
  const products = ((extra as { products?: ProductCardData[] } | undefined)?.products ?? []) as ProductCardData[];
  if (products.length === 0) return null;

  return (
    <section className="space-y-4">
      {s.heading && <h2 className="text-lg font-semibold tracking-tight">{s.heading}</h2>}
      {s.variant === 'carousel' ? (
        <ProductRail products={products} columns={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.productId} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
