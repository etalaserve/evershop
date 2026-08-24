import { insert } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Seeds the homepage's `top_categories` and `latest_products` widgets.
 *
 * The homepage route (`_index.tsx`) used to render its category grid and
 * "New arrivals" product grid as hardcoded JSX, outside the widget system
 * entirely — not draggable, not deletable, not visible in the page
 * builder's Layers panel. Both are now real widget types (see
 * `lib/widgets/bootstrap.ts`), and the route now renders only its
 * `content` `WidgetArea`. Without this seed, a fresh install's homepage
 * (or this migration's target DB, which has zero pre-existing widget rows)
 * would render blank below the header — this reproduces the same default
 * placement/settings the old hardcoded markup effectively had, so nothing
 * regresses visually, it's just editable now.
 *
 * Guarded by a `NOT EXISTS` check on `(route='homepage', area='content')`
 * placements rather than an unconditional insert, so this migration is a
 * no-op on any store that already has homepage content widgets (a merchant
 * who used the page builder before upgrading shouldn't get two unrelated
 * widgets dropped on top of their own layout).
 */
export default async (connection: PoolClient): Promise<void> => {
  const { rows } = await connection.query(
    `SELECT 1 FROM widget_placement WHERE route = 'homepage' AND area = 'content' LIMIT 1`
  );
  if (rows.length > 0) return;

  const topCategories = await insert('widget_instance')
    .given({
      name: 'Top categories',
      type: 'top_categories',
      settings: JSON.stringify({ heading: null }),
      status: true
    })
    .execute(connection);
  await insert('widget_placement')
    .given({
      widget_instance_id: (topCategories as { insertId: number }).insertId,
      route: 'homepage',
      area: 'content',
      sort_order: 100
    })
    .execute(connection);

  const latestProducts = await insert('widget_instance')
    .given({
      name: 'Latest products',
      type: 'latest_products',
      settings: JSON.stringify({
        heading: 'New arrivals',
        subText: null,
        count: 8,
        countPerRow: 4,
        viewAllLink: null,
        viewAllLabel: null,
        variant: 'grid'
      }),
      status: true
    })
    .execute(connection);
  await insert('widget_placement')
    .given({
      widget_instance_id: (latestProducts as { insertId: number }).insertId,
      route: 'homepage',
      area: 'content',
      sort_order: 200
    })
    .execute(connection);
};
