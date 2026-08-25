import { walkTree } from '@puckeditor/core/rsc';

/** One component in a Puck document, flattened out of the tree. */
export interface PuckNode {
  /** `props.id` — set by the converter to the original `widget_instance.uuid`. */
  id: string;
  type: string;
  props: Record<string, unknown>;
}

/**
 * Flatten every component in a Puck document, at any depth.
 *
 * This is `flattenWidgets`' replacement. It delegates traversal to Puck's own
 * `walkTree` rather than hand-rolling it: slots are declared per component in
 * the config, so a hand-written walk would have to re-derive which props hold
 * children and would drift the moment a container gains a slot. `walkTree`
 * reads the same config Puck renders from, so it cannot disagree with what
 * actually gets rendered.
 *
 * `walkTree` visits ZONES (each slot's content array), not individual nodes —
 * verified against 0.23.0, including a 3-level-deep nested container, where
 * every node appears in exactly one zone. Concatenating the zones therefore
 * yields every component exactly once. It also visits bottom-up, which is why
 * the result is explicitly documented as unordered: callers here fan out with
 * `Promise.all` and key by id, so order carries no meaning. Do not add an
 * order dependency without sorting first.
 *
 * Nodes without a `props.id` are skipped. Stored documents always carry one
 * (`ComponentData.props` requires it; only authoring-time
 * `ComponentDataOptionalId` does not), so this only guards against a
 * hand-written or partially-migrated document, where the alternative would be
 * an `undefined` key silently colliding in the extras map.
 */
export function collectPuckNodes(data: unknown, config: unknown): PuckNode[] {
  const nodes: PuckNode[] = [];

  walkTree(data as never, config as never, (content) => {
    for (const item of content) {
      const props = (item.props ?? {}) as Record<string, unknown>;
      const id = props.id;
      if (typeof id === 'string' && id) {
        nodes.push({ id, type: item.type as string, props });
      }
    }
    // Returning the content unchanged keeps this a pure read. `walkTree` is a
    // transform API — returning nothing would strip the zone.
    return content;
  });

  return nodes;
}
