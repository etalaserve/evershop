import { useState } from 'react';
import { Button } from '~/components/ui/button.js';
import { addToCart } from '~/lib/cart/client.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';
import { CommercePlaceholder } from './CommercePlaceholder.js';

/**
 * The buy button — quantity stepper plus add-to-cart.
 *
 * Page furniture rather than content: it has no settings, and everything it
 * shows comes from the product the page is about, delivered through
 * `page.product.detail`. That is why it is a widget at all — making the PDP
 * fully composable means a merchant can put this below the description, or in
 * a column beside the gallery, instead of wherever the route template hard-
 * coded it.
 *
 * It is also the component the required-component rule exists to protect: a
 * product page without it cannot be bought from, so `REQUIRED_COMPONENTS`
 * refuses to save or publish a `productView` document that omits it.
 *
 * Lifted from the product route verbatim — same stepper, same disabled
 * states, same status text — so composing the page cannot change what buying
 * feels like.
 */
export function ProductAddToCart({ page }: WidgetComponentProps) {
  const product = page?.product?.detail;

  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<'idle' | 'adding' | 'added'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Hooks run before this: they cannot be called conditionally, and an early
  // return above them would break the rules of hooks the moment a product is
  // absent (which is exactly the editor case).
  if (!product) {
    return <CommercePlaceholder label="Add to cart" />;
  }

  async function handleAddToCart() {
    setStatus('adding');
    setError(null);
    try {
      await addToCart(product!.sku, qty);
      setStatus('added');
    } catch (e) {
      setStatus('idle');
      setError(e instanceof Error ? e.message : 'Could not add to cart');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border border-input">
          <button
            type="button"
            className="px-3 py-1.5 text-sm"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-sm">{qty}</span>
          <button
            type="button"
            className="px-3 py-1.5 text-sm"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <Button
          disabled={!product.inventory.isInStock || status === 'adding'}
          onClick={() => void handleAddToCart()}
        >
          {status === 'adding' ? 'Adding…' : status === 'added' ? 'Added' : 'Add to cart'}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
