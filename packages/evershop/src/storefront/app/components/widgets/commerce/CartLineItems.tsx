import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';
import { CommercePlaceholder } from './CommercePlaceholder.js';

/**
 * The cart's line items, with per-line removal.
 *
 * Removal navigates through the route rather than mutating here: the cart is
 * loader data, so a component that edited it locally would drift from the
 * server's totals. Submitting to the route keeps one source of truth, which is
 * what the route's own handler already did.
 */
export function CartLineItems({ page }: WidgetComponentProps) {
  const cart = page?.cart?.cart;
  if (!cart) return <CommercePlaceholder label="Cart items" />;

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {cart.items.map((item) => (
        <div key={item.uuid} className="flex items-center gap-4 p-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            {item.thumbnail ? (
              <img
                src={imageUrl(item.thumbnail)}
                alt={item.productName ?? ''}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{item.productName}</p>
            <p className="text-xs text-muted-foreground">
              {item.qty} × {item.finalPrice.text}
            </p>
          </div>
          <p className="text-sm font-medium">{item.lineTotal.text}</p>
          <form method="post" action="/cart">
            <input type="hidden" name="intent" value="remove" />
            <input type="hidden" name="itemUuid" value={item.uuid} />
            <button
              type="submit"
              className="text-xs text-muted-foreground underline hover:text-destructive"
            >
              Remove
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
