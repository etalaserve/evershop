import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '~/components/ui/card.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';
import { CommercePlaceholder } from './CommercePlaceholder.js';

/**
 * The signed-in customer's profile summary.
 *
 * Renders the placeholder rather than empty fields when there is no customer:
 * account pages are behind a session, so an absent customer means the editor,
 * not a signed-out shopper (the route redirects those before rendering).
 */
export function AccountProfile({ page }: WidgetComponentProps) {
  const customer = page?.customer?.customer;
  if (!customer) return <CommercePlaceholder label="Customer profile" />;

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
