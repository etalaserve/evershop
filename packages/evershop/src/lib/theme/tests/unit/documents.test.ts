import { manifestDocuments } from '../../documents.js';
import { manifestSchema } from '../../manifest.js';
import type { Manifest } from '../../manifest.js';

/** uuid-shaped ids: the converter's synthetic-area regex only matches hex/dashes. */
function uid(n: number): string {
  return `${String(n).padStart(8, '0')}-1111-2222-3333-444444444444`;
}

const base = { theme_name: 'demo', version: '1.0.0' };

describe('manifestSchema', () => {
  it('treats a manifest with no schema field as schema 1', () => {
    // Every theme published before the Puck migration predates the field and
    // must keep installing — that reader is permanent, not a deprecation
    // window.
    expect(manifestSchema({ ...base, widgets: [], placements: [] })).toBe(1);
  });

  it('infers schema 2 from the presence of documents', () => {
    expect(manifestSchema({ ...base, documents: [] })).toBe(2);
  });

  it('lets an explicit schema field win', () => {
    expect(manifestSchema({ ...base, schema: 2, documents: [] })).toBe(2);
    expect(manifestSchema({ ...base, schema: 1, widgets: [], placements: [] })).toBe(1);
  });

  it('treats an empty manifest as schema 1', () => {
    expect(manifestSchema({ ...base } as Manifest)).toBe(1);
  });
});

describe('manifestDocuments', () => {
  it('passes schema-2 documents through untouched', () => {
    const documents = [
      { route: 'homepage', scope_urn: null, data: { root: { props: {} }, content: [] } }
    ];
    const out = manifestDocuments({ ...base, schema: 2, documents });
    expect(out.documents).toEqual(documents);
    expect(out.orphaned).toEqual([]);
  });

  it('converts a schema-1 manifest into documents', () => {
    // The point of the conversion: an old theme installs into the model the
    // storefront actually reads, rather than writing widget rows nothing
    // renders from after cutover.
    const manifest: Manifest = {
      ...base,
      widgets: [
        { uuid: uid(1), type: 'banner', name: 'Hero', settings: { heading: 'Hi' } }
      ],
      placements: [
        {
          uuid: uid(2),
          widget_instance_uuid: uid(1),
          route: 'homepage',
          area: 'content',
          sort_order: 100
        }
      ]
    };

    const { documents, orphaned } = manifestDocuments(manifest);
    expect(orphaned).toEqual([]);
    expect(documents).toHaveLength(1);
    expect(documents[0].route).toBe('homepage');
    expect(documents[0].scope_urn).toBeNull();

    const content = (documents[0].data as { content: Array<{ type: string; props: { id: string } }> })
      .content;
    expect(content.map((c) => c.type)).toEqual(['banner']);
    // Component ids keep the widget uuid, which is what makes extras lookups
    // and any external reference survive the conversion.
    expect(content[0].props.id).toBe(uid(1));
  });

  it('produces one document per route the manifest places into', () => {
    const manifest: Manifest = {
      ...base,
      widgets: [
        { uuid: uid(1), type: 'banner', name: 'A', settings: {} },
        { uuid: uid(2), type: 'banner', name: 'B', settings: {} }
      ],
      placements: [
        { uuid: uid(3), widget_instance_uuid: uid(1), route: 'homepage', area: 'content', sort_order: 100 },
        { uuid: uid(4), widget_instance_uuid: uid(2), route: 'cart', area: 'content', sort_order: 100 }
      ]
    };

    const { documents } = manifestDocuments(manifest);
    expect(documents.map((d) => d.route).sort()).toEqual(['cart', 'homepage']);
    // Each document holds only its own route's content — a document is keyed
    // by route, so cross-contamination here would put a homepage banner on
    // every cart page.
    for (const doc of documents) {
      const content = (doc.data as { content: unknown[] }).content;
      expect(content).toHaveLength(1);
    }
  });

  it('keeps nested container children', () => {
    // Nesting is the conversion's likeliest silent failure: a flattened or
    // dropped child still produces a valid-looking document.
    const parent = uid(1);
    const manifest: Manifest = {
      ...base,
      widgets: [
        { uuid: parent, type: 'columns', name: 'Cols', settings: { columnCount: 2 } },
        { uuid: uid(2), type: 'banner', name: 'Inner', settings: {} }
      ],
      placements: [
        { uuid: uid(3), widget_instance_uuid: parent, route: 'homepage', area: 'content', sort_order: 100 },
        {
          uuid: uid(4),
          widget_instance_uuid: uid(2),
          route: 'homepage',
          area: `columnsContainer_${parent}_col_0`,
          sort_order: 100
        }
      ]
    };

    const { documents, orphaned } = manifestDocuments(manifest);
    expect(orphaned).toEqual([]);
    const root = (documents[0].data as { content: Array<{ type: string; props: Record<string, unknown> }> })
      .content;
    expect(root[0].type).toBe('columns');
    expect(root[0].props.col0).toHaveLength(1);
  });

  it('reports content it could not convert instead of dropping it silently', () => {
    // A placement whose parent container is absent. Installing the theme
    // anyway and saying nothing would leave it looking installed and being
    // wrong, with nothing to tell the merchant what is missing.
    const manifest: Manifest = {
      ...base,
      widgets: [{ uuid: uid(2), type: 'banner', name: 'Orphan', settings: {} }],
      placements: [
        {
          uuid: uid(4),
          widget_instance_uuid: uid(2),
          route: 'homepage',
          area: `columnsContainer_${uid(9)}_col_0`,
          sort_order: 100
        }
      ]
    };

    const { orphaned } = manifestDocuments(manifest);
    expect(orphaned.length).toBeGreaterThan(0);
    expect(orphaned[0].reason).toBe('unresolved-parent');
  });

  it('returns nothing for a manifest that places nothing', () => {
    expect(manifestDocuments({ ...base, widgets: [], placements: [] }).documents).toEqual([]);
  });
});
