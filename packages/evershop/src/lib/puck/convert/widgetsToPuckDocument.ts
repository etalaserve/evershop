import { parseColumnArea, buildColumnArea } from '../../widget/columnArea.js';

/**
 * Convert between the widget tables' flat representation and a Puck `Data`
 * document, in both directions.
 *
 * The two shapes disagree on exactly one thing, and it is the whole job:
 *
 *   - Widget tables: every widget is a sibling row. A child of a container is
 *     an ordinary `widget_placement` whose `area` string encodes its parent's
 *     uuid — `columnsContainer_<parentUuid>_col_<n>`. There is no parent FK.
 *   - Puck: children live *inside* their parent, as an array of ComponentData
 *     on a slot prop.
 *
 * So `toPuckDocument` reifies a string-encoded graph into a tree, and
 * `toWidgetRows` flattens it back. Both are pure — no DB, no clock, no uuid
 * generation beyond what the caller supplies — so they are exhaustively
 * testable, which matters because a silent mistake here is silent content
 * loss on a live storefront.
 *
 * ## Component ids
 *
 * Each component's `props.id` is set to the source `widget_instance.uuid`.
 * That is deliberate, not incidental: extras are keyed by it
 * (`resolveWidgetExtras` today, `resolvePuckExtras` after the cutover), e2e
 * selectors reference it, and keeping it makes the conversion auditable —
 * you can diff a document against the rows it came from. It is also what
 * makes the inverse lossless for migrated content.
 */

/** A Puck component instance. `props.id` carries the original widget uuid. */
export interface ComponentData {
  type: string;
  props: Record<string, unknown> & { id: string };
}

export interface PuckData {
  content: ComponentData[];
  root: { props: Record<string, unknown> };
}

/** Minimal shapes the converter needs — deliberately not the full row types, so tests can build fixtures cheaply. */
export interface WidgetInstanceLike {
  uuid: string;
  type: string;
  settings: Record<string, unknown> | null;
}
export interface WidgetPlacementLike {
  uuid: string;
  widget_instance_uuid: string;
  area: string;
  sort_order: number;
}

export interface ConvertResult {
  data: PuckData;
  /**
   * Placements that could not be attached to the tree, with why. These are
   * NOT silently dropped and NOT silently included — the caller reports them.
   *
   * Two causes, both pre-existing in the data rather than introduced here:
   *  - `unresolved-parent`: the synthetic area names a parent uuid that isn't
   *    in this set. There is no parent FK, so nothing prevented it.
   *  - `too-deep`: nested beyond what the storefront can currently render.
   *    `WIDGET_FIELDS` (lib/graphql/queries/widgets.ts) hand-unrolls exactly
   *    3 levels, so anything deeper exists in the DB but has never been
   *    displayed. Including it would make content *appear* on live pages as a
   *    side effect of a storage migration, which is not a migration's job.
   */
  orphaned: { placementUuid: string; area: string; reason: 'unresolved-parent' | 'too-deep' }[];
}

/** Depth the storefront can actually render today: top level + 2 nested. */
export const MAX_RENDERABLE_DEPTH = 3;

const AREA_CONTENT = 'content';

/**
 * Build a Puck document from one route/scope's widget rows.
 *
 * `areaId` is the top-level area to take as the document body — always
 * `content` in the current storefront (every route mounts exactly one
 * `WidgetArea areaId="content"`).
 */
export function toPuckDocument(
  instances: WidgetInstanceLike[],
  placements: WidgetPlacementLike[],
  opts: { areaId?: string; includeDeep?: boolean } = {}
): ConvertResult {
  const areaId = opts.areaId ?? AREA_CONTENT;
  const includeDeep = opts.includeDeep ?? false;

  const byUuid = new Map(instances.map((i) => [i.uuid, i]));
  const orphaned: ConvertResult['orphaned'] = [];

  // Group children by parent uuid + column index in ONE pass. The naive
  // version rescans every placement per widget, which is O(W×P) and is
  // exactly the shape that made `computeOverlayColumns` slow.
  const childrenOf = new Map<string, Map<number, WidgetPlacementLike[]>>();
  const topLevel: WidgetPlacementLike[] = [];

  for (const p of placements) {
    const col = parseColumnArea(p.area);
    if (!col) {
      if (p.area === areaId) topLevel.push(p);
      continue;
    }
    let cols = childrenOf.get(col.parentUuid);
    if (!cols) {
      cols = new Map();
      childrenOf.set(col.parentUuid, cols);
    }
    const bucket = cols.get(col.columnIndex);
    if (bucket) bucket.push(p);
    else cols.set(col.columnIndex, [p]);
  }

  const attached = new Set<string>();

  function build(placement: WidgetPlacementLike, depth: number): ComponentData | null {
    const instance = byUuid.get(placement.widget_instance_uuid);
    if (!instance) {
      orphaned.push({
        placementUuid: placement.uuid,
        area: placement.area,
        reason: 'unresolved-parent'
      });
      return null;
    }
    attached.add(placement.uuid);

    const props: Record<string, unknown> & { id: string } = {
      ...(instance.settings ?? {}),
      id: instance.uuid
    };

    const cols = childrenOf.get(instance.uuid);
    if (cols) {
      for (const [index, kids] of [...cols.entries()].sort((a, b) => a[0] - b[0])) {
        if (depth + 1 >= MAX_RENDERABLE_DEPTH && !includeDeep) {
          for (const k of kids) {
            orphaned.push({ placementUuid: k.uuid, area: k.area, reason: 'too-deep' });
          }
          continue;
        }
        // Slot props are named `col0`, `col1`, … mirroring the synthetic
        // area's column index, so the mapping stays legible both ways.
        props[`col${index}`] = kids
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((k) => build(k, depth + 1))
          .filter((c): c is ComponentData => c !== null);
      }
    }

    return { type: instance.type, props };
  }

  const content = topLevel
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => build(p, 0))
    .filter((c): c is ComponentData => c !== null);

  // Any child placement never reached from the top level had a parent that
  // isn't in this set — record it rather than losing it silently.
  for (const [parentUuid, cols] of childrenOf) {
    if (byUuid.has(parentUuid) && attached.has(parentUuid)) continue;
    for (const kids of cols.values()) {
      for (const k of kids) {
        if (attached.has(k.uuid)) continue;
        if (orphaned.some((o) => o.placementUuid === k.uuid)) continue;
        orphaned.push({
          placementUuid: k.uuid,
          area: k.area,
          reason: 'unresolved-parent'
        });
      }
    }
  }

  return { data: { content, root: { props: {} } }, orphaned };
}

export interface FlatRows {
  instances: WidgetInstanceLike[];
  placements: Omit<WidgetPlacementLike, 'uuid'>[];
}

/**
 * Inverse of `toPuckDocument` — flatten a document back into widget rows.
 *
 * Kept in the same module as the forward direction on purpose: they are one
 * contract, and the round-trip property test (`toWidgetRows(toPuckDocument(x))
 * ≡ x`) is the main defence against a conversion bug. It is also the rollback
 * path — the migration is only reversible while this exists.
 *
 * Placement uuids are not reproduced (they are storage identity, not content);
 * the caller mints them. Everything that *is* content — type, settings, order,
 * nesting — round-trips exactly.
 */
export function toWidgetRows(data: PuckData, opts: { areaId?: string } = {}): FlatRows {
  const areaId = opts.areaId ?? AREA_CONTENT;
  const instances: WidgetInstanceLike[] = [];
  const placements: Omit<WidgetPlacementLike, 'uuid'>[] = [];

  function walk(components: ComponentData[], area: string): void {
    components.forEach((c, i) => {
      const { id, ...rest } = c.props;
      const settings: Record<string, unknown> = {};
      const slots: [number, ComponentData[]][] = [];

      for (const [key, value] of Object.entries(rest)) {
        const m = /^col(\d+)$/.exec(key);
        if (m && Array.isArray(value)) {
          slots.push([Number.parseInt(m[1], 10), value as ComponentData[]]);
        } else {
          settings[key] = value;
        }
      }

      instances.push({ uuid: id, type: c.type, settings });
      placements.push({
        widget_instance_uuid: id,
        area,
        // Rebuild the original spacing rather than using the raw index: the
        // column is REAL specifically so a later insert can take a midpoint
        // (cms/Version-1.3.0.ts:52-55), and collapsing to 0,1,2 would throw
        // that away on the first round trip.
        sort_order: (i + 1) * 100
      });

      for (const [index, kids] of slots.sort((a, b) => a[0] - b[0])) {
        walk(kids, buildColumnArea(id, index));
      }
    });
  }

  walk(data.content, areaId);
  return { instances, placements };
}
