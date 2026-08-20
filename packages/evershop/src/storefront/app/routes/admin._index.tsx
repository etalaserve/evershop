import { select } from '@evershop/postgres-query-builder';

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card.js';
import { pool } from '../../../lib/postgres/connection.js';

/**
 * Deliberately smaller than the legacy dashboard (Statistic/Bestsellers/
 * Bestcustomers/Lifetimesales widgets, recharts-based, injected via Area
 * from the oms module) — plain counts, no charts. A real replacement for
 * those recharts widgets is future work.
 */
export async function loader() {
  const [orders, products, customers, revenue] = await Promise.all([
    pool.query('SELECT count(*)::int AS count FROM "order"'),
    pool.query('SELECT count(*)::int AS count FROM product WHERE status = true'),
    pool.query('SELECT count(*)::int AS count FROM customer'),
    pool.query('SELECT coalesce(sum(grand_total), 0)::float AS total FROM "order"')
  ]);
  return {
    orderCount: orders.rows[0].count,
    productCount: products.rows[0].count,
    customerCount: customers.rows[0].count,
    revenue: revenue.rows[0].total
  };
}

export default function Dashboard({
  loaderData: { orderCount, productCount, customerCount, revenue }
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  const stats = [
    { label: 'Orders', value: orderCount },
    { label: 'Active products', value: productCount },
    { label: 'Customers', value: customerCount },
    { label: 'Total revenue', value: `$${revenue.toFixed(2)}` }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">{s.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
