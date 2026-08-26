import {
  REQUIRED_COMPONENTS,
  collectComponentTypes,
  findMissingRequired
} from '../../validateDocument.js';

/** A stand-in policy, so these tests describe the MECHANISM rather than today's (empty) table. */
const RULES = { productView: ['ProductAddToCart', 'ProductPrice'] };

function doc(content: unknown[]) {
  return { root: { props: {} }, content };
}

describe('collectComponentTypes', () => {
  it('finds top-level component types', () => {
    const types = collectComponentTypes(
      doc([
        { type: 'banner', props: { id: 'a' } },
        { type: 'ProductAddToCart', props: { id: 'b' } }
      ])
    );
    expect([...types].sort()).toEqual(['ProductAddToCart', 'banner']);
  });

  it('finds components nested inside slots, at any depth', () => {
    // The case the guarantee hinges on: a merchant can satisfy the rule by
    // putting add-to-cart inside a Columns, and a shallow check would call
    // that page broken.
    const types = collectComponentTypes(
      doc([
        {
          type: 'columns',
          props: {
            id: 'c',
            col0: [
              {
                type: 'section',
                props: {
                  id: 'd',
                  col0: [{ type: 'ProductAddToCart', props: { id: 'e' } }]
                }
              }
            ],
            col1: []
          }
        }
      ])
    );
    expect(types.has('ProductAddToCart')).toBe(true);
  });

  it('does not mistake a settings object with a `type` key for a component', () => {
    // Widget settings are arbitrary merchant JSON and can contain a `type`
    // field of their own. Requiring a sibling `props` object is what keeps a
    // setting from satisfying a route guarantee.
    const types = collectComponentTypes(
      doc([{ type: 'banner', props: { id: 'a', cta: { type: 'ProductAddToCart' } } }])
    );
    expect(types.has('ProductAddToCart')).toBe(false);
    expect(types.has('banner')).toBe(true);
  });
});

describe('findMissingRequired', () => {
  it('returns nothing for a route with no rules', () => {
    expect(findMissingRequired('homepage', doc([]), RULES)).toEqual([]);
  });

  it('returns nothing when every required component is present', () => {
    const d = doc([
      { type: 'ProductAddToCart', props: { id: 'a' } },
      { type: 'ProductPrice', props: { id: 'b' } }
    ]);
    expect(findMissingRequired('productView', d, RULES)).toEqual([]);
  });

  it('names exactly what is missing', () => {
    const d = doc([{ type: 'ProductPrice', props: { id: 'b' } }]);
    expect(findMissingRequired('productView', d, RULES)).toEqual(['ProductAddToCart']);
  });

  it('treats deleting the document as removing everything required', () => {
    // Deleting the document is the simplest way to remove a required
    // component, so a null payload has to fail rather than read as "no rules
    // apply".
    expect(findMissingRequired('productView', null, RULES)).toEqual([
      'ProductAddToCart',
      'ProductPrice'
    ]);
  });

  it('accepts a required component nested inside a container', () => {
    const d = doc([
      { type: 'ProductPrice', props: { id: 'b' } },
      {
        type: 'columns',
        props: { id: 'c', col0: [{ type: 'ProductAddToCart', props: { id: 'a' } }], col1: [] }
      }
    ]);
    expect(findMissingRequired('productView', d, RULES)).toEqual([]);
  });

  it('uses the real table by default', () => {
    // The shipped table is intentionally empty until each route's commerce
    // components exist — a rule naming an unregistered component would reject
    // every save on that route.
    expect(findMissingRequired('productView', doc([]))).toEqual([]);
    expect(Object.keys(REQUIRED_COMPONENTS)).not.toContain('checkout');
  });
});
