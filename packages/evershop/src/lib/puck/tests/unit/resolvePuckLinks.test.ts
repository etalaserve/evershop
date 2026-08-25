import { resolvePuckLinks } from '../../resolvePuckLinks.js';

const config = {
  components: {
    columns: {
      fields: { col0: { type: 'slot' }, col1: { type: 'slot' } },
      render: () => null
    },
    banner: { fields: { cta: { type: 'text' } }, render: () => null },
    menu: { fields: { columns: { type: 'array' } }, render: () => null }
  }
};

const CATEGORY_URN = 'urn:evershop:catalog:category:11111111-1111-1111-1111-111111111111';
const PRODUCT_URN = 'urn:evershop:catalog:product:22222222-2222-2222-2222-222222222222';

/** Stand-in for `resolveLink` bound to request-scoped loaders. */
const resolver = async (urn: string) => {
  if (urn === CATEGORY_URN) return '/shoes';
  if (urn === PRODUCT_URN) return '/p/blue-mug';
  return null;
};

describe('resolvePuckLinks', () => {
  it('resolves a URN-valued prop to a storefront URL', async () => {
    const out = await resolvePuckLinks(
      {
        root: { props: {} },
        content: [{ type: 'banner', props: { id: 'b', cta: CATEGORY_URN } }]
      },
      config,
      resolver
    );
    expect(out.content[0].props.cta).toBe('/shoes');
  });

  it('leaves non-URN strings completely alone', async () => {
    // The gate that makes a type-agnostic walk safe: ordinary copy must never
    // be rewritten, or every heading becomes a resolution candidate.
    const props = {
      id: 'b',
      cta: 'https://example.com/sale',
      heading: 'Shop the sale',
      note: 'urn-ish but not a urn'
    };
    const out = await resolvePuckLinks(
      { root: { props: {} }, content: [{ type: 'banner', props }] },
      config,
      resolver
    );
    expect(out.content[0].props).toMatchObject(props);
  });

  it('resolves URNs nested inside arrays of objects', async () => {
    // footer_menu's columns[].links[].url is two levels down; a walker that
    // only looked at top-level props would silently miss every menu link.
    const out = await resolvePuckLinks(
      {
        root: { props: {} },
        content: [
          {
            type: 'menu',
            props: {
              id: 'm',
              columns: [
                { heading: 'Shop', links: [{ label: 'Shoes', url: CATEGORY_URN }] }
              ]
            }
          }
        ]
      },
      config,
      resolver
    );
    expect(out.content[0].props.columns[0].links[0].url).toBe('/shoes');
    expect(out.content[0].props.columns[0].links[0].label).toBe('Shoes');
  });

  it('resolves URNs inside slot children without dropping the children', async () => {
    // The nesting case: slot props hold child components. They must be
    // resolved (as their own nodes) and must still be there afterwards.
    const out = await resolvePuckLinks(
      {
        root: { props: {} },
        content: [
          {
            type: 'columns',
            props: {
              id: 'c',
              col0: [{ type: 'banner', props: { id: 'inner', cta: PRODUCT_URN } }],
              col1: []
            }
          }
        ]
      },
      config,
      resolver
    );
    const col0 = out.content[0].props.col0;
    expect(col0).toHaveLength(1);
    expect(col0[0].props.cta).toBe('/p/blue-mug');
    expect(col0[0].props.id).toBe('inner');
  });

  it('nulls an unresolvable URN so the component suppresses the link', async () => {
    const out = await resolvePuckLinks(
      {
        root: { props: {} },
        content: [
          {
            type: 'banner',
            props: { id: 'b', cta: 'urn:evershop:catalog:category:deleted' }
          }
        ]
      },
      config,
      resolver
    );
    expect(out.content[0].props.cta).toBeNull();
  });

  it('nulls rather than throwing when the resolver rejects', async () => {
    const out = await resolvePuckLinks(
      {
        root: { props: {} },
        content: [{ type: 'banner', props: { id: 'b', cta: CATEGORY_URN } }]
      },
      config,
      async () => {
        throw new Error('db down');
      }
    );
    expect(out.content[0].props.cta).toBeNull();
  });

  it('does not mutate the input document', async () => {
    // The input may be a cached object shared across requests — mutating it
    // would leak one request's resolved URLs into every later render.
    const data = {
      root: { props: {} },
      content: [{ type: 'banner', props: { id: 'b', cta: CATEGORY_URN } }]
    };
    const before = JSON.stringify(data);
    await resolvePuckLinks(data, config, resolver);
    expect(JSON.stringify(data)).toBe(before);
  });

  it('returns the document untouched when it holds no URNs', async () => {
    const calls: string[] = [];
    const data = {
      root: { props: {} },
      content: [{ type: 'banner', props: { id: 'b', cta: '/plain' } }]
    };
    const out = await resolvePuckLinks(data, config, async (u) => {
      calls.push(u);
      return null;
    });
    expect(calls).toEqual([]);
    expect(out).toBe(data);
  });

  it('resolves each distinct URN once even when repeated', async () => {
    // Deduplication is what lets the underlying DataLoader batch.
    const calls: string[] = [];
    await resolvePuckLinks(
      {
        root: { props: {} },
        content: [
          { type: 'banner', props: { id: 'a', cta: CATEGORY_URN } },
          { type: 'banner', props: { id: 'b', cta: CATEGORY_URN } }
        ]
      },
      config,
      async (u) => {
        calls.push(u);
        return '/shoes';
      }
    );
    expect(calls).toEqual([CATEGORY_URN]);
  });
});
