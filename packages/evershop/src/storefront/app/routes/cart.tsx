import { Link, useLoaderData, useRevalidator } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { buttonVariants } from '~/components/ui/button.js';
import { Separator } from '~/components/ui/separator.js';
import { WidgetArea } from '~/components/widgets/WidgetArea.js';
import { removeCartItem } from '~/lib/cart/client.js';
import { gql } from '~/lib/graphql/client.js';
import { CART_QUERY, type CartResponse } from '~/lib/graphql/queries/cart.js';
import { WIDGETS_FOR_ROUTE_QUERY, type WidgetsForRouteResponse } from '~/lib/graphql/queries/widgets.js';
import { imageUrl } from '~/lib/image.js';
import { buildMeta } from '~/lib/seo.js';
import { cn } from '~/lib/utils.js';
import { resolveWidgetExtras } from '~/lib/widgets/resolveWidgetExtras.js';

// Matches `cart`'s legacy route id (`editable: true`). The
// `cart_frequently_bought_together` widget type already existed — this is
// the first route that actually mounts a WidgetArea a merchant can drop it
// into.
const ROUTE_ID = 'cart';

export const meta: MetaFunction = () => buildMeta({ title: 'Your cart', noindex: true });

export async function loader({ request }: LoaderFunctionArgs) {
  // myCart resolves from the sid session cookie — graphql-request doesn't
  // forward the browser's cookies on its own for this server-side call, so
  // it has to be passed through explicitly.
  const cookie = request.headers.get('Cookie');
  const changeset = new URL(request.url).searchParams.get('changeset');

  const [result, widgetData] = await Promise.all([
    gql<CartResponse>(CART_QUERY, undefined, cookie ? { Cookie: cookie } : undefined),
    gql<WidgetsForRouteResponse>(WIDGETS_FOR_ROUTE_QUERY, { route: ROUTE_ID, changeset })
  ]);
  const widgets = widgetData.widgetsForRoute;
  const extras = await resolveWidgetExtras(widgets, cookie);

  return { cart: result.myCart, widgets, extras };
}

export default function CartPage() {
  const { cart, widgets, extras } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  async function handleRemove(itemUuid: string) {
    await removeCartItem(itemUuid);
    revalidator.revalidate();
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-16">
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Your cart is empty</h1>
          <Link to="/" className={cn(buttonVariants())}>
            Continue shopping
          </Link>
        </div>
        <WidgetArea areaId="content" widgets={widgets} extras={extras} />
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
      <WidgetArea areaId="content" widgets={widgets} extras={extras} />
    </div>
  );
}
