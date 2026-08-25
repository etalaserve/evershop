import { collectPuckNodes } from '../../collectNodes.js';

/**
 * A minimal config standing in for `buildPuckConfig()`'s output. Only the
 * `fields` matter — `walkTree` reads slot declarations, never `render` — so
 * this deliberately avoids importing the storefront config (which pulls in
 * React components jest cannot load from `dist`).
 */
const config = {
  components: {
    columns: {
      fields: { col0: { type: 'slot' }, col1: { type: 'slot' } },
      render: () => null
    },
    leaf: { fields: { heading: { type: 'text' } }, render: () => null }
  }
};

function leaf(id: string, heading = '') {
  return { type: 'leaf', props: { id, heading } };
}

describe('collectPuckNodes', () => {
  it('returns top-level components', () => {
    const nodes = collectPuckNodes(
      { root: { props: {} }, content: [leaf('a'), leaf('b')] },
      config
    );
    expect(nodes.map((n) => n.id).sort()).toEqual(['a', 'b']);
  });

  it('descends into slots, including a container nested inside a container', () => {
    // The whole point of delegating to `walkTree`: the widget pipeline could
    // only render 3 levels, and a converter bug that flattens or drops a level
    // is silent. This asserts the deepest node is reached.
    const data = {
      root: { props: {} },
      content: [
        leaf('top'),
        {
          type: 'columns',
          props: {
            id: 'container',
            col0: [
              leaf('nested'),
              {
                type: 'columns',
                props: { id: 'deep', col0: [leaf('deepest')], col1: [] }
              }
            ],
            col1: []
          }
        }
      ]
    };

    const nodes = collectPuckNodes(data, config);
    expect(nodes.map((n) => n.id).sort()).toEqual([
      'container',
      'deep',
      'deepest',
      'nested',
      'top'
    ]);
  });

  it('yields each component exactly once', () => {
    // Guards the concatenate-the-zones assumption: if `walkTree` ever visited
    // a node in more than one zone, extras would be resolved twice and the
    // duplicate would be invisible in a map keyed by id.
    const data = {
      root: { props: {} },
      content: [
        {
          type: 'columns',
          props: { id: 'c', col0: [leaf('x')], col1: [leaf('y')] }
        }
      ]
    };
    const ids = collectPuckNodes(data, config).map((n) => n.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('carries props through verbatim, so settings survive the walk', () => {
    const nodes = collectPuckNodes(
      { root: { props: {} }, content: [leaf('a', 'Hello')] },
      config
    );
    expect(nodes[0]).toMatchObject({
      id: 'a',
      type: 'leaf',
      props: { id: 'a', heading: 'Hello' }
    });
  });

  it('skips a node with no id rather than keying extras on undefined', () => {
    const data = {
      root: { props: {} },
      content: [{ type: 'leaf', props: { heading: 'no id' } }, leaf('a')]
    };
    expect(collectPuckNodes(data, config).map((n) => n.id)).toEqual(['a']);
  });

  it('handles an empty document', () => {
    expect(collectPuckNodes({ root: { props: {} }, content: [] }, config)).toEqual([]);
  });
});
