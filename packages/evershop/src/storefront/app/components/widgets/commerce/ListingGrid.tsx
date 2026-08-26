import { ProductGrid } from '~/components/catalog/product-grid.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';
import { CommercePlaceholder } from './CommercePlaceholder.js';

/**
 * The products of a listing page, in the shared catalog grid.
 *
 * Renders the grid even when the listing is empty rather than hiding itself:
 * `ProductGrid` owns the empty state, and a component that vanished would
 * leave a search with no results looking like a broken page instead of one
 * saying nothing matched.
 */
export function ListingGrid({ page }: WidgetComponentProps) {
  const listing = page?.listing;
  if (!listing) return <CommercePlaceholder label="Product listing" />;

  return <ProductGrid products={listing.products} />;
}
