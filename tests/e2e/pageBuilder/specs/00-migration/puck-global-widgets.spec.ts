import { randomUUID } from 'node:crypto';
import { expect, test } from '../../../shared/test.js';
import { getDb } from '../../../shared/db.js';
import {
  restorePuckDocuments,
  snapshotPuckDocuments,
  type PuckDocumentSnapshot
} from '../../../shared/puckDocuments.js';
import { backfillPuckDocuments } from '../../../../../packages/evershop/dist/lib/puck/convert/backfillPuckDocuments.js';

/**
 * Site-wide content (`widget_placement.route = 'all'`).
 *
 * The widget model expressed "appears on every page" as a placement whose
 * route is the literal `all`, interleaved with a page's own content by
 * `sort_order`. The document model is keyed by route and has no `sort_order`,
 * so globals get an explicit shape instead: a `global_regions` container whose
 * two slots the render path splices above and below each route's content.
 *
 * This spec exists because the gap is invisible on a normal store — no store
 * has a content-area global, which is exactly why it went unnoticed until it
 * was looked for. It seeds one deliberately.
 */

const GLOBAL_REGIONS_TYPE = 'global_regions';

test.describe('site-wide content', () => {
  let documentsBefore: PuckDocumentSnapshot[] = [];

  test.beforeEach(async () => {
    documentsBefore = await snapshotPuckDocuments();
  });

  test.afterEach(async () => {
    await restorePuckDocuments(documentsBefore);
  });

  test('a route=all placement converts into the globals document', async () => {
    const db = getDb();
    const marker = `e2e-global-${randomUUID().slice(0, 8)}`;

    try {
      await db.query(
        `WITH w AS (
           INSERT INTO widget_instance (name, type, settings, status)
           VALUES ($1, 'coupon_block',
             '{"heading":"Site wide","code":"GLOBAL1","variant":"card"}'::jsonb, true)
           RETURNING widget_instance_id)
         INSERT INTO widget_placement (widget_instance_id, route, area, sort_order)
         SELECT widget_instance_id, 'all', 'content', 100 FROM w`,
        [`${marker}-global`]
      );

      const report = await backfillPuckDocuments(db as never);
      expect(report.orphaned, 'converter reported orphaned nodes').toEqual([]);

      // It becomes a document like any other — the `all` route is no longer a
      // dead end the backfill can only report.
      const globals = report.documents.find(
        (d: { route: string }) => d.route === 'all'
      );
      expect(globals, 'the global placement was not converted').toBeTruthy();

      // ...and its content sits in the container's "before" region, matching
      // the widget model where a global rendered above the page's own content.
      const { rows } = await db.query<{
        data: {
          content: Array<{ type: string; props: { before: unknown[]; after: unknown[] } }>;
        };
      }>(`SELECT data FROM puck_document WHERE route = 'all'`);
      expect(rows, 'no globals document was written').toHaveLength(1);

      const [container] = rows[0].data.content;
      expect(container.type).toBe(GLOBAL_REGIONS_TYPE);
      expect(container.props.before).toHaveLength(1);
      expect(container.props.after).toEqual([]);
      expect(JSON.stringify(container.props.before)).toContain('Site wide');
    } finally {
      await db.query(`DELETE FROM widget_instance WHERE name LIKE $1`, [
        `${marker}-%`
      ]);
    }
  });

  test('the editor never merges globals into the route being edited', async ({
    request
  }) => {
    // The merge is render-only. If the editing path merged, a merchant editing
    // `homepage` would save the site-wide content INTO the homepage document —
    // silently copying globals into one page, which then diverges from them
    // forever. This is the single most damaging way globals could go wrong.
    const db = getDb();
    const heading = `EditorGlobal ${randomUUID().slice(0, 6)}`;

    await db.query(
      `INSERT INTO puck_document (route, scope_urn, theme, data)
       VALUES ('all', NULL, NULL, $1::jsonb)
       ON CONFLICT (route, COALESCE(scope_urn,''), COALESCE(theme,''))
       DO UPDATE SET data = EXCLUDED.data`,
      [
        JSON.stringify({
          root: { props: {} },
          content: [
            {
              type: GLOBAL_REGIONS_TYPE,
              props: {
                id: randomUUID(),
                before: [
                  {
                    type: 'coupon_block',
                    props: { id: randomUUID(), heading, code: 'G2', variant: 'card' }
                  }
                ],
                after: []
              }
            }
          ]
        })
      ]
    );

    // The storefront shows it...
    expect(await (await request.get('/?__engine=puck')).text()).toContain(heading);

    // ...and the editor for that same route does not.
    const editor = await request.get('/admin/page-builder/puck/homepage');
    expect(editor.ok()).toBe(true);
    expect(
      await editor.text(),
      'the editor merged globals into the route document'
    ).not.toContain(heading);
  });

  test('globals render on routes that have no document of their own', async ({
    request
  }) => {
    const db = getDb();
    const heading = `Global ${randomUUID().slice(0, 6)}`;

    // A route with no document of its own, so the only thing that can put this
    // content on the page is the merge.
    await db.query(`DELETE FROM puck_document WHERE route = 'blogHome'`);
    await db.query(
      `INSERT INTO puck_document (route, scope_urn, theme, data)
       VALUES ('all', NULL, NULL, $1::jsonb)
       ON CONFLICT (route, COALESCE(scope_urn,''), COALESCE(theme,''))
       DO UPDATE SET data = EXCLUDED.data`,
      [
        JSON.stringify({
          root: { props: {} },
          content: [
            {
              type: GLOBAL_REGIONS_TYPE,
              props: {
                id: randomUUID(),
                before: [
                  {
                    type: 'coupon_block',
                    props: { id: randomUUID(), heading, code: 'G1', variant: 'card' }
                  }
                ],
                after: []
              }
            }
          ]
        })
      ]
    );

    const res = await request.get('/blog?__engine=puck');
    expect(res.ok()).toBe(true);
    expect(
      await res.text(),
      'site-wide content did not reach a route with no document of its own'
    ).toContain(heading);
  });
});
