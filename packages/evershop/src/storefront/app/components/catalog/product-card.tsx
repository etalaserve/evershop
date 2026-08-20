import { Link } from 'react-router';

import { Badge } from '~/components/ui/badge.js';
import { Card } from '~/components/ui/card.js';
import type { ProductCard as ProductCardData } from '~/lib/graphql/queries/catalog.js';
import { imageUrl } from '~/lib/image.js';

export function ProductCard({ product }: { product: ProductCardData }) {
  const onSale =
    product.price.special != null && product.price.special.value < product.price.regular.value;

  return (
    <Link to={`/product/${product.urlKey}`} prefetch="intent" className="group block">
      <Card className="overflow-hidden py-0">
        <div className="relative aspect-square bg-muted">
          {product.image ? (
            <img
              src={imageUrl(product.image.url)}
              alt={product.image.alt ?? product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
          {onSale && (
            <Badge variant="destructive" className="absolute left-2 top-2">
              Sale
            </Badge>
          )}
          {!product.inventory.isInStock && (
            <Badge variant="secondary" className="absolute right-2 top-2">
              Out of stock
            </Badge>
          )}
        </div>
        <div className="space-y-1 p-3">
          <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
          <div className="flex items-center gap-2">
            {onSale ? (
              <>
                <span className="text-sm font-semibold">{product.price.special!.text}</span>
                <span className="text-xs text-muted-foreground line-through">
                  {product.price.regular.text}
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold">{product.price.regular.text}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
