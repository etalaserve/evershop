import { describe, it, expect } from '@jest/globals';
import {
  toPuckDocument,
  toWidgetRows,
  MAX_RENDERABLE_DEPTH,
  type WidgetInstanceLike,
  type WidgetPlacementLike
} from '../../convert/widgetsToPuckDocument.js';

/**
 * The widget→Puck converter is the single highest-risk piece of the Puck
 * migration: its failure mode is silent content loss on a live storefront
 * (a nested child dropped, a container flattened, an order inverted) with no
 * error anywhere. These tests exist to make that loud.
 */

/**
 * Fixtures address widgets by short readable names, but the names must
 * resolve to UUID-SHAPED ids: the synthetic area convention encodes its
 * parent as `columnsContainer_<uuid>_col_<n>` and `SYNTHETIC_AREA_RE`
 * (lib/widget/columnArea.ts) only matches `[0-9a-fA-F-]+`. A non-uuid
 * component id silently fails to parse and the child is reported orphaned —
 * so tests written with names like "parent" would pass the wrong thing and
 * "prove" a bug that isn't there (as an earlier draft of this file did).
 */
const uuids = new Map<string, string>();
function uid(name: string): string {
  let v = uuids.get(name);
  if (!v) {
    const n = (uuids.size + 1).toString(16).padStart(12, '0');
    v = `0000000a-0000-4000-8000-${n}`;
    uuids.set(name, v);
  }
  return v;
}

const inst = (name: string, type: string, settings: Record<string, unknown> = {}): WidgetInstanceLike => ({
  uuid: uid(name),
  type,
  settings
});
const place = (
  uuid: string,
  name: string,
  area: string,
  sort_order: number
): WidgetPlacementLike => ({
  uuid,
  widget_instance_uuid: uid(name),
  area,
  sort_order
});

const col = (parentName: string, i: number) =>
  `columnsContainer_${uid(parentName)}_col_${i}`;

describe('toPuckDocument', () => {
  it('orders top-level content by sort_order, not row order', () => {
    const { data, orphaned } = toPuckDocument(
      [inst('a', 'banner'), inst('b', 'text_block')],
      // deliberately supplied out of order
      [place('pb', 'b', 'content', 100), place('pa', 'a', 'content', 300)]
    );
    expect(data.content.map((c) => c.type)).toEqual(['text_block', 'banner']);
    expect(orphaned).toEqual([]);
  });

  it('lifts settings onto props and keeps the widget uuid as props.id', () => {
    const { data } = toPuckDocument(
      [inst('a', 'banner', { heading: 'Hi', overlayOpacity: 0.3 })],
      [place('pa', 'a', 'content', 100)]
    );
    expect(data.content[0].props).toEqual({
      heading: 'Hi',
      overlayOpacity: 0.3,
      id: uid('a')
    });
  });

  it('nests columnsContainer_<uuid>_col_<n> children into slot props', () => {
    const { data, orphaned } = toPuckDocument(
      [inst('parent', 'columns'), inst('kid0', 'text_block'), inst('kid1', 'banner')],
      [
        place('pp', 'parent', 'content', 100),
        place('p1', 'kid1', col('parent', 1), 100),
        place('p0', 'kid0', col('parent', 0), 100)
      ]
    );
    expect(orphaned).toEqual([]);
    const props = data.content[0].props as Record<string, any>;
    expect(props.col0.map((c: any) => c.type)).toEqual(['text_block']);
    expect(props.col1.map((c: any) => c.type)).toEqual(['banner']);
    // Children must not leak into the document body.
    expect(data.content).toHaveLength(1);
  });

  it('orders siblings within a column by sort_order', () => {
    const { data } = toPuckDocument(
      [inst('p', 'columns'), inst('x', 'banner'), inst('y', 'text_block')],
      [
        place('pp', 'p', 'content', 100),
        place('px', 'x', col('p', 0), 200),
        place('py', 'y', col('p', 0), 100)
      ]
    );
    const props = data.content[0].props as Record<string, any>;
    expect(props.col0.map((c: any) => c.type)).toEqual(['text_block', 'banner']);
  });

  it('reports a child whose parent uuid does not exist rather than dropping it', () => {
    const { data, orphaned } = toPuckDocument(
      [inst('kid', 'banner')],
      [place('pk', 'kid', `columnsContainer_${uid('ghost-parent')}_col_0`, 100)]
    );
    expect(data.content).toEqual([]);
    expect(orphaned).toEqual([
      {
        placementUuid: 'pk',
        area: `columnsContainer_${uid('ghost-parent')}_col_0`,
        reason: 'unresolved-parent'
      }
    ]);
  });

  it('excludes nodes deeper than the storefront can render, and says so', () => {
    // depth 0 → 1 → 2 is renderable; the 4th level is not.
    const instances = [
      inst('l0', 'columns'),
      inst('l1', 'columns'),
      inst('l2', 'columns'),
      inst('l3', 'banner')
    ];
    const placements = [
      place('p0', 'l0', 'content', 100),
      place('p1', 'l1', col('l0', 0), 100),
      place('p2', 'l2', col('l1', 0), 100),
      place('p3', 'l3', col('l2', 0), 100)
    ];

    const { data, orphaned } = toPuckDocument(instances, placements);
    expect(orphaned).toEqual([
      { placementUuid: 'p3', area: col('l2', 0), reason: 'too-deep' }
    ]);
    const l2 = (data.content[0].props as any).col0[0].props.col0[0];
    expect(l2.type).toBe('columns');
    expect(l2.props.col0).toBeUndefined();

    // ...unless explicitly asked for.
    const deep = toPuckDocument(instances, placements, { includeDeep: true });
    expect(deep.orphaned).toEqual([]);
    const l3 = (deep.data.content[0].props as any).col0[0].props.col0[0].props.col0[0];
    expect(l3.type).toBe('banner');
  });

  it('ignores placements in other areas', () => {
    const { data } = toPuckDocument(
      [inst('a', 'banner'), inst('b', 'basic_menu')],
      [place('pa', 'a', 'content', 100), place('pb', 'b', 'headerTop', 100)]
    );
    expect(data.content.map((c) => c.type)).toEqual(['banner']);
  });

  it('produces an empty but well-formed document for a route with no widgets', () => {
    const { data, orphaned } = toPuckDocument([], []);
    expect(data).toEqual({ content: [], root: { props: {} } });
    expect(orphaned).toEqual([]);
  });
});

describe('round trip', () => {
  const cases: [string, WidgetInstanceLike[], WidgetPlacementLike[]][] = [
    ['flat', [inst('a', 'banner', { h: 1 }), inst('b', 'text_block')], [place('pa', 'a', 'content', 100), place('pb', 'b', 'content', 200)]],
    [
      'nested one level',
      [inst('p', 'columns', { columnCount: 2 }), inst('k', 'banner', { h: 'x' })],
      [place('pp', 'p', 'content', 100), place('pk', 'k', col('p', 1), 100)]
    ],
    [
      'nested two levels, multiple columns',
      [inst('p', 'columns'), inst('m', 'section'), inst('k0', 'banner'), inst('k1', 'text_block')],
      [
        place('pp', 'p', 'content', 100),
        place('pm', 'm', col('p', 0), 100),
        place('pk0', 'k0', col('m', 0), 100),
        place('pk1', 'k1', col('p', 1), 100)
      ]
    ]
  ];

  for (const [name, instances, placements] of cases) {
    it(`${name}: structure survives widgets → document → widgets`, () => {
      const { data, orphaned } = toPuckDocument(instances, placements);
      expect(orphaned).toEqual([]);

      const back = toWidgetRows(data);

      // Same instances, same types, same settings.
      expect(back.instances.map((i) => i.uuid).sort()).toEqual(
        instances.map((i) => i.uuid).sort()
      );
      for (const original of instances) {
        const rt = back.instances.find((i) => i.uuid === original.uuid)!;
        expect(rt.type).toBe(original.type);
        expect(rt.settings).toEqual(original.settings ?? {});
      }

      // Same parent/child relationships, expressed as the same area strings.
      const areaOf = (rows: { widget_instance_uuid: string; area: string }[]) =>
        Object.fromEntries(rows.map((r) => [r.widget_instance_uuid, r.area]));
      expect(areaOf(back.placements)).toEqual(
        areaOf(
          placements.map((p) => ({
            widget_instance_uuid: p.widget_instance_uuid,
            area: p.area
          }))
        )
      );
    });
  }

  it('re-spaces sort_order so midpoint inserts stay possible', () => {
    const { data } = toPuckDocument(
      [inst('a', 'banner'), inst('b', 'text_block')],
      [place('pa', 'a', 'content', 1), place('pb', 'b', 'content', 2)]
    );
    const back = toWidgetRows(data);
    // Not 0,1 — the column is REAL precisely so a widget can later be inserted
    // between two others without renumbering the whole area.
    expect(back.placements.map((p) => p.sort_order)).toEqual([100, 200]);
  });

  it('separates slot props from settings when flattening', () => {
    const back = toWidgetRows({
      content: [
        {
          type: 'columns',
          props: {
            id: uid('flatten-p'),
            columnCount: 2,
            col0: [{ type: 'banner', props: { id: uid('flatten-k') } }]
          }
        }
      ],
      root: { props: {} }
    });
    const parent = back.instances.find((i) => i.uuid === uid('flatten-p'))!;
    expect(parent.settings).toEqual({ columnCount: 2 });
    expect(
      back.placements.find((p) => p.widget_instance_uuid === uid('flatten-k'))!.area
    ).toBe(`columnsContainer_${uid('flatten-p')}_col_0`);
  });
});

describe('depth constant', () => {
  it('matches what the storefront GraphQL fragment can actually return', () => {
    // WIDGET_FIELDS (storefront/app/lib/graphql/queries/widgets.ts) hand-unrolls
    // columns → widgets → columns → widgets, i.e. top level plus two nested.
    // If that fragment gains a level, this constant has to move with it or the
    // migration will keep hiding content the storefront could now display.
    expect(MAX_RENDERABLE_DEPTH).toBe(3);
  });
});
