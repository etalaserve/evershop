import { useLoaderData, useOutletContext } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { WidgetArea } from '~/components/widgets/WidgetArea.js';
import { gql } from '~/lib/graphql/client.js';
import type { CurrentCustomerResponse } from '~/lib/graphql/queries/customer.js';
import { WIDGETS_FOR_ROUTE_QUERY, type WidgetsForRouteResponse } from '~/lib/graphql/queries/widgets.js';
import { resolveWidgetExtras } from '~/lib/widgets/resolveWidgetExtras.js';

type Customer = NonNullable<CurrentCustomerResponse['currentCustomer']>;

// Matches `account`'s legacy route id (`editable: true`) — the `/account`
// dashboard specifically, not `/account/orders` or `/account/addresses`
// (neither of those has an `editable` route.json entry of its own), so this
// lives here rather than in the shared `account.tsx` layout.
const ROUTE_ID = 'account';

export async function loader({ request }: LoaderFunctionArgs) {
  const changeset = new URL(request.url).searchParams.get('changeset');
  const cookie = request.headers.get('Cookie');
  const widgetData = await gql<WidgetsForRouteResponse>(WIDGETS_FOR_ROUTE_QUERY, { route: ROUTE_ID, changeset });
  const widgets = widgetData.widgetsForRoute;
  const extras = await resolveWidgetExtras(widgets, cookie);
  return { widgets, extras };
}

export default function AccountProfile() {
  const { customer } = useOutletContext<{ customer: Customer }>();
  const { widgets, extras } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Name: </span>
            {customer.fullName}
          </div>
          <div>
            <span className="text-muted-foreground">Email: </span>
            {customer.email}
          </div>
          <div>
            <span className="text-muted-foreground">Member since: </span>
            {customer.createdAt.text}
          </div>
        </CardContent>
      </Card>
      <WidgetArea areaId="content" widgets={widgets} extras={extras} />
    </div>
  );
}
