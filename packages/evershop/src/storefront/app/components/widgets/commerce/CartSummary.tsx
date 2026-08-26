import { Link } from 'react-router';
import { buttonVariants } from '~/components/ui/button.js';
import { cn } from '~/lib/utils.js';
import { Separator } from '~/components/ui/separator.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';
import { CommercePlaceholder } from './CommercePlaceholder.js';

/**
 * Cart total and the way to checkout.
 *
 * This is the cart's required component: without it there is no route from the
 * cart to checkout, which is the same class of breakage as a product page with
 * no add-to-cart. `REQUIRED_COMPONENTS` refuses to save or publish a `cart`
 * document that omits it.
 */
export function CartSummary({ page }: WidgetComponentProps) {
  const cart = page?.cart?.cart;
  if (!cart) return <CommercePlaceholder label="Cart total and checkout" />;

  return (
    <div className="space-y-6">
      <Separator />
      <div className="flex items-center justify-between text-lg font-semibold">
        <span>Total</span>
        <span>{cart.grandTotal.text}</span>
      </div>
      <Link to="/checkout" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
        Checkout
      </Link>
    </div>
  );
}
