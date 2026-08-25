import { nestFlatFields } from '../../buildFields.js';

/**
 * Field mapping is the riskiest part of the Puck config generator and the one
 * piece with no other verification: the byte-diff harness compares rendered
 * output, and fields are editor UI that never reaches the page.
 *
 * These exercise the mapper directly. The generator that consumes it
 * (`storefront/app/lib/puck/buildPuckConfig.ts`) lives in the Vite bundle,
 * which is never compiled into `dist/` and so is unreachable to this runner —
 * it is covered by the byte-diff harness instead.
 */

/** Representative shapes drawn from the real fieldConfig.ts, incl. its two hard cases. */
const FIXTURE_CONFIGS: Record<string, any[]> = {
  trust_strip: [
    { key: 'items', label: 'Items', type: 'array', itemLabel: 'title',
      defaultItem: { id: '', title: 'New item', link: { url: '', newTab: false } },
      itemFields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'icon', label: 'Icon', type: 'image' },
        { key: 'link.url', label: 'Link URL', type: 'text' },
        { key: 'link.newTab', label: 'Open in new tab', type: 'toggle' }
      ] }
  ],
  // array nested inside array, two levels deep
  footer_menu: [
    { key: 'columns', label: 'Columns', type: 'array', itemLabel: 'title',
      defaultItem: { id: '', title: 'New column', links: [] },
      itemFields: [
        { key: 'title', label: 'Column title', type: 'text' },
        { key: 'links', label: 'Links', type: 'array', itemLabel: 'label',
          defaultItem: { id: '', label: 'New link', url: '' },
          itemFields: [
            { key: 'label', label: 'Label', type: 'text' },
            { key: 'url', label: 'URL', type: 'text' }
          ] }
      ] }
  ],
  banner: [
    { key: 'src', label: 'Image', type: 'image' },
    { key: 'overlayOpacity', label: 'Opacity', type: 'number', min: 0, max: 1, step: 0.05 },
    { key: 'contentPosition', label: 'Position', type: 'select',
      options: [{ value: 'mc', label: 'MC' }] },
    { key: 'cta', label: 'CTA (JSON)', type: 'json' },
    { key: 'backgroundColor', label: 'Background', type: 'color' }
  ]
};

describe('nestFlatFields', () => {
  it('maps the 1:1 primitives', () => {
    const fields = nestFlatFields([
      { key: 'a', label: 'A', type: 'text' },
      { key: 'b', label: 'B', type: 'textarea' },
      { key: 'c', label: 'C', type: 'number', min: 1, max: 9 },
      { key: 'd', label: 'D', type: 'select', options: [{ value: 'x', label: 'X' }] }
    ] as any);
    expect(fields.a).toEqual({ type: 'text', label: 'A' });
    expect(fields.b).toEqual({ type: 'textarea', label: 'B' });
    expect(fields.c).toEqual({ type: 'number', label: 'C', min: 1, max: 9 });
    expect(fields.d).toEqual({
      type: 'select',
      label: 'D',
      options: [{ label: 'X', value: 'x' }]
    });
  });

  it('turns dot-path keys into a nested object field', () => {
    // fieldConfig addresses `trust_strip.items[].link.url` as a FLAT key;
    // Puck needs an object field matching the real prop shape.
    const fields = nestFlatFields([
      { key: 'link.url', label: 'Link URL', type: 'text' },
      { key: 'link.newTab', label: 'New tab', type: 'toggle' }
    ] as any);
    expect((fields.link as any).type).toBe('object');
    expect(Object.keys((fields.link as any).objectFields)).toEqual(['url', 'newTab']);
  });

  it('maps the four types Puck has no primitive for to custom fields', () => {
    const fields = nestFlatFields([
      { key: 'on', label: 'On', type: 'toggle' },
      { key: 'col', label: 'Colour', type: 'color' },
      { key: 'img', label: 'Image', type: 'image' },
      { key: 'raw', label: 'Raw', type: 'json' }
    ] as any);
    for (const k of ['on', 'col', 'img', 'raw']) {
      expect((fields[k] as any).type).toBe('custom');
    }
  });

  it('injects custom field renderers when the editor supplies them', () => {
    const render = () => null;
    const fields = nestFlatFields([{ key: 'on', label: 'On', type: 'toggle' }] as any, {
      toggle: render
    });
    expect((fields.on as any).render).toBe(render);
  });

  it('gives array items a FUNCTION defaultItemProps that mints a fresh id', () => {
    // Puck's defaultItemProps accepts a function, which is what lets each added
    // item get its own uuid the way SettingsForm.tsx does. A static object
    // would hand every item the same empty id and collide React keys.
    const fields = nestFlatFields([
      {
        key: 'items',
        label: 'Items',
        type: 'array',
        defaultItem: { id: '', title: 'New' },
        itemFields: [{ key: 'title', label: 'Title', type: 'text' }]
      }
    ] as any);
    const make = (fields.items as any).defaultItemProps;
    expect(typeof make).toBe('function');
    const a = make(0);
    const b = make(1);
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
    expect(a.title).toBe('New');
  });

  it('derives getItemSummary from a dot-path itemLabel', () => {
    const fields = nestFlatFields([
      {
        key: 'groups',
        label: 'Groups',
        type: 'array',
        itemLabel: 'parent.label',
        defaultItem: {},
        itemFields: [{ key: 'parent.label', label: 'Label', type: 'text' }]
      }
    ] as any);
    const summary = (fields.groups as any).getItemSummary;
    expect(summary({ parent: { label: 'Shoes' } }, 0)).toBe('Shoes');
    // Falls back to a positional name rather than rendering blank.
    expect(summary({}, 2)).toBe('Item 3');
  });

  it('maps the real configs shapes — including both nested-array cases', () => {
    // Fixtures mirror the awkward shapes in the real fieldConfig.ts rather
    // than importing it: that file lives in the Vite bundle, which never
    // reaches dist/ and so is unreachable here. `trust_strip` covers
    // dot-paths inside an array; `footer_menu` covers array-inside-array.
    for (const [type, config] of Object.entries(FIXTURE_CONFIGS)) {
      try {
        nestFlatFields(config as any);
      } catch (e) {
        throw new Error(`${type} failed to map: ${(e as Error).message}`);
      }
    }
  });

  it('maps array-inside-array two levels deep', () => {
    const fields = nestFlatFields(FIXTURE_CONFIGS.footer_menu as any);
    const inner = (fields.columns as any).arrayFields.links;
    expect(inner.type).toBe('array');
    expect(inner.arrayFields.url).toEqual({ type: 'text', label: 'URL' });
  });

  it('throws on an unrecognised field type instead of dropping it', () => {
    expect(() =>
      nestFlatFields([{ key: 'x', label: 'X', type: 'not-a-real-type' }] as any)
    ).toThrow(/Unmapped fieldConfig type 'not-a-real-type'/);
  });
});
