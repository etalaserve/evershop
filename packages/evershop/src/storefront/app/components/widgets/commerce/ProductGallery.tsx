import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';
import { CommercePlaceholder } from './CommercePlaceholder.js';

/**
 * Main product image plus its thumbnail strip.
 *
 * Lifted from the product route unchanged. A product with no image renders the
 * empty aspect-ratio box rather than collapsing, so the page keeps its layout
 * — the route did this too, and losing it would shift every element beside the
 * gallery whenever a product lacked imagery.
 */
export function ProductGallery({ page }: WidgetComponentProps) {
  const product = page?.product?.detail;
  if (!product) return <CommercePlaceholder label="Product gallery" />;

  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
        {product.image ? (
          <img
            src={imageUrl(product.image.url)}
            alt={product.image.alt ?? product.name}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      {product.gallery.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {product.gallery.map((img, i) => (
            <div key={i} className="aspect-square overflow-hidden rounded-md bg-muted">
              <img
                src={imageUrl(img.url)}
                alt={img.alt ?? product.name}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
