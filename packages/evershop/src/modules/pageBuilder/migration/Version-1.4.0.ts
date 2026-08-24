import { insert } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Seeds the `related_products` widget onto the `productView` route.
 *
 * Product pages used to render a hardcoded "You may also like" section
 * (product.$urlKey.tsx), duplicating what the `related_products` widget
 * already does — removed in favor of this seeded, route-level widget (same
 * `heading`/`limit`/`variant` defaults the hardcoded version effectively
 * had) so every product page keeps showing related products by default,
 * but it's now editable/removable through the page builder.
 *
 * Guarded the same way as Version-1.3.0: a no-op if `productView` already
 * has any `content`-area placement, so a store that already customized its
 * product page via the page builder doesn't get an unrelated widget
 * dropped on top.
 */
export default async (connection: PoolClient): Promise<void> => {
  const { rows } = await connection.query(
    `SELECT 1 FROM widget_placement WHERE route = 'productView' AND area = 'content' LIMIT 1`
  );
  if (rows.length > 0) return;

  const relatedProducts = await insert('widget_instance')
    .given({
      name: 'Related products',
      type: 'related_products',
      settings: JSON.stringify({ heading: 'You may also like', limit: 4, variant: 'grid' }),
      status: true
    })
    .execute(connection);
  await insert('widget_placement')
    .given({
      widget_instance_id: (relatedProducts as { insertId: number }).insertId,
      route: 'productView',
      area: 'content',
      sort_order: 100
    })
    .execute(connection);
};
