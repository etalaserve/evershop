import { Badge } from '~/components/ui/badge.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';
import { CommercePlaceholder } from './CommercePlaceholder.js';

/**
 * Price, with the sale treatment when a special price applies.
 *
 * Lifted from the product route unchanged, including the rule for what counts
 * as "on sale" — a special price that differs from the regular one. Keeping
 * that comparison here rather than simplifying it to "special exists" matters:
 * a special price equal to the regular one is not a sale, and showing a struck
 * -through identical price is a bug merchants notice immediately.
 */
export function ProductPrice({ page }: WidgetComponentProps) {
  const product = page?.product?.detail;
  if (!product) return <CommercePlaceholder label="Price" />;

  const onSale =
    !!product.price.special && product.price.special.value !== product.price.regular.value;

  return (
    <div className="flex items-center gap-2">
      {onSale ? (
        <>
          <span className="text-xl font-semibold">{product.price.special!.text}</span>
          <span className="text-sm text-muted-foreground line-through">
            {product.price.regular.text}
          </span>
          <Badge variant="destructive">Sale</Badge>
        </>
      ) : (
        <span className="text-xl font-semibold">{product.price.regular.text}</span>
      )}
    </div>
  );
}
