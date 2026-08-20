import { Link, useLoaderData, useRevalidator } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';

import { buttonVariants } from '~/components/ui/button.js';
import { Separator } from '~/components/ui/separator.js';
import { removeCartItem } from '~/lib/cart/client.js';
import { gql } from '~/lib/graphql/client.js';
import { CART_QUERY, type CartResponse } from '~/lib/graphql/queries/cart.js';
import { imageUrl } from '~/lib/image.js';
import { buildMeta } from '~/lib/seo.js';
import { cn } from '~/lib/utils.js';

export const meta: MetaFunction = () => buildMeta({ title: 'Your cart', noindex: true });

export async function loader({ request }: LoaderFunctionArgs) {
  // myCart resolves from the sid session cookie — graphql-request doesn't
  // forward the browser's cookies on its own for this server-side call, so
  // it has to be passed through explicitly.
  const cookie = request.headers.get('Cookie');
  const result = await gql<CartResponse>(CART_QUERY, undefined, cookie ? { Cookie: cookie } : undefined);
  return { cart: result.myCart };
}

export default function CartPage() {
  const { cart } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  async function handleRemove(itemUuid: string) {
    await removeCartItem(itemUuid);
    revalidator.revalidate();
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link to="/" className={cn(buttonVariants())}>
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Your cart</h1>
      <div className="divide-y divide-border rounded-lg border border-border">
        {cart.items.map((item) => (
          <div key={item.uuid} className="flex items-center gap-4 p-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
              {item.thumbnail ? (
                <img src={imageUrl(item.thumbnail)} alt={item.productName ?? ''} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{item.productName}</p>
              <p className="text-xs text-muted-foreground">
                {item.qty} × {item.finalPrice.text}
              </p>
            </div>
            <p className="text-sm font-medium">{item.lineTotal.text}</p>
            <button
              type="button"
              className="text-xs text-muted-foreground underline hover:text-destructive"
              onClick={() => handleRemove(item.uuid)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
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
