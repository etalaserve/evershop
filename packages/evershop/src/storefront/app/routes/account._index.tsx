import { useLoaderData, useOutletContext } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { WidgetArea } from '~/components/widgets/WidgetArea.js';
import { PuckArea } from '~/components/widgets/PuckArea.js';
import { loadPuckForRequest } from '~/lib/puck/engineSwitch.js';
import {
  CURRENT_CUSTOMER_QUERY,
  type CurrentCustomerResponse
} from '~/lib/graphql/queries/customer.js';
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
  /**
   * TEMPORARY: `?__engine=puck` renders this route through Puck instead.
   *
   * The customer normally reaches this page through the parent layout's outlet
   * context, which a loader cannot read — so under Puck it has to be fetched
   * here. Guarded on the engine flag rather than fetched unconditionally: on
   * the ordinary path the layout has already loaded it, and a second identical
   * query per account page view would be pure waste.
   */
  const wantsPuck = new URL(request.url).searchParams.get('__engine') === 'puck';
  const customer = wantsPuck
    ? (await gql<CurrentCustomerResponse>(CURRENT_CUSTOMER_QUERY, {}, cookie))
        .currentCustomer
    : null;
  const puck = await loadPuckForRequest(request, ROUTE_ID, {
    ...(customer ? { customer: { customer } } : {})
  });

  return { widgets, extras, puck };
}

export default function AccountProfile() {
  const { customer } = useOutletContext<{ customer: Customer }>();
  const { widgets, extras, puck } = useLoaderData<typeof loader>();

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
      {puck ? (
        <PuckArea data={puck.data} metadata={puck.metadata} />
      ) : (
        <WidgetArea areaId="content" widgets={widgets} extras={extras} />
      )}
    </div>
  );
}
