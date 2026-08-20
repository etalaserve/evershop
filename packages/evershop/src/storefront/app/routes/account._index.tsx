import { useOutletContext } from 'react-router';

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import type { CurrentCustomerResponse } from '~/lib/graphql/queries/customer.js';

type Customer = NonNullable<CurrentCustomerResponse['currentCustomer']>;

export default function AccountProfile() {
  const { customer } = useOutletContext<{ customer: Customer }>();

  return (
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
  );
}
