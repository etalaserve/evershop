import type { WidgetComponentProps } from '~/lib/widgets/registry.js';
import { CommercePlaceholder } from './CommercePlaceholder.js';

/**
 * Title and count for a product listing — a category page or a search result.
 *
 * Both routes render this identically; only the words differ ("Shoes" and a
 * product count, versus `Results for "boots"`). The route decides what it
 * says, this decides how it looks, which is why one component serves both
 * rather than a near-duplicate per route.
 */
export function ListingHeader({ page }: WidgetComponentProps) {
  const listing = page?.listing;
  if (!listing) return <CommercePlaceholder label="Listing header" />;

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold">{listing.title}</h1>
      {listing.subtitle ? (
        <p className="text-sm text-muted-foreground">{listing.subtitle}</p>
      ) : null}
    </div>
  );
}
