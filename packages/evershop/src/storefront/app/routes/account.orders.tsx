import { Link, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { Card, CardContent } from '~/components/ui/card.js';
import { forwardCookieHeaders } from '~/lib/auth/session.js';
import { gql } from '~/lib/graphql/client.js';
import { CUSTOMER_ORDERS_QUERY, type CustomerOrdersResponse } from '~/lib/graphql/queries/customer.js';

export async function loader({ request }: LoaderFunctionArgs) {
  // account.tsx (the parent layout route) already redirects to /login when
  // signed out, so a null currentCustomer here would mean the session
  // expired between the layout's loader and this one — treat as empty.
  const result = await gql<CustomerOrdersResponse>(
    CUSTOMER_ORDERS_QUERY,
    undefined,
    forwardCookieHeaders(request)
  );
  return { orders: result.currentCustomer?.orders ?? [] };
}

export default function AccountOrders() {
  const { orders } = useLoaderData<typeof loader>();

  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground">You haven't placed any orders yet.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link key={order.uuid} to={`/order/${order.uuid}`}>
          <Card>
            <CardContent className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium">Order #{order.orderNumber}</p>
                <p className="text-muted-foreground">
                  {order.createdAt.text} · {order.totalQty} items
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{order.grandTotal.text}</p>
                <p className="text-muted-foreground">{order.status?.name}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
