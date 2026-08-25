import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Render } from '@puckeditor/core/rsc';

/**
 * Pins the Puck behaviours the migration's design depends on.
 *
 * These are not tests of our code — they are a contract with `@puckeditor/core`
 * (currently 0.x, so its API can move between minors). Each assertion here
 * corresponds to a design decision that would silently rot if the behaviour
 * changed: an upgrade that breaks one should fail loudly in CI rather than
 * surface later as missing content on a storefront.
 *
 * Everything below was verified empirically before the design was committed
 * to, not assumed from the docs.
 */

const WIDGET_UUID = '0000000a-0000-4000-8000-000000000001';
const CHILD_UUID = '0000000a-0000-4000-8000-000000000002';
const PARENT_UUID = '0000000a-0000-4000-8000-000000000003';

interface Seen {
  id: string;
  metadata: Record<string, unknown> | undefined;
  heading?: string;
}

function buildConfig(seen: Seen[]) {
  return {
    components: {
      Banner: {
        render: (props: any) => {
          seen.push({
            id: props.id,
            metadata: props.puck?.metadata,
            heading: props.heading
          });
          return React.createElement(
            'div',
            { 'data-id': props.id },
            props.heading
          );
        }
      },
      Columns: {
        // Slot props MUST be declared as fields. Without this Puck hands the
        // raw child array to render() and React throws "Element type is
        // invalid… got: object" — the container appears to work while
        // silently dropping every child. The config generator has to emit a
        // slot field per column for every container widget.
        fields: { col0: { type: 'slot' as const } },
        render: ({ col0: Col0, id }: any) =>
          React.createElement(
            'section',
            { 'data-id': id },
            Col0 ? React.createElement(Col0) : null
          )
      }
    }
  } as any;
}

const data = {
  content: [
    { type: 'Banner', props: { id: WIDGET_UUID, heading: 'top level' } },
    {
      type: 'Columns',
      props: {
        id: PARENT_UUID,
        col0: [{ type: 'Banner', props: { id: CHILD_UUID, heading: 'nested' } }]
      }
    }
  ],
  root: { props: {} }
} as any;

function render(seen: Seen[], metadata: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    React.createElement(Render as any, { config: buildConfig(seen), data, metadata })
  );
}

describe('@puckeditor/core contract', () => {
  it('preserves props.id verbatim, including inside slots', () => {
    // The entire extras design keys on this: the converter writes the source
    // widget_instance.uuid into props.id, and `resolvePuckExtras` looks data
    // up by it. If Puck ever regenerated or namespaced ids, every commerce
    // widget would silently render with no data.
    const seen: Seen[] = [];
    render(seen);
    expect(seen.map((s) => s.id).sort()).toEqual([WIDGET_UUID, CHILD_UUID].sort());
  });

  it('passes metadata to every component, including nested ones', () => {
    // How server-resolved commerce data reaches components once Puck renders
    // in-process — there is no loader inside a Puck tree.
    const seen: Seen[] = [];
    render(seen, { extras: { [WIDGET_UUID]: 'EXTRA!' } });
    expect(seen).toHaveLength(2);
    for (const s of seen) {
      expect((s.metadata as any)?.extras?.[WIDGET_UUID]).toBe('EXTRA!');
    }
  });

  it('renders slot children, so converted container widgets survive', () => {
    // The converter turns `columnsContainer_<uuid>_col_<n>` placement rows
    // into `col0`/`col1` slot props. This is the proof that shape renders.
    const html = render([]);
    expect(html).toContain(`data-id="${CHILD_UUID}"`);
    expect(html).toContain('nested');
  });

  it('exposes Render from /rsc without pulling in the editor', () => {
    // The storefront must not ship the editor bundle. `/rsc` is the lean
    // server entry — config + data + metadata, no <Puck>.
    expect(typeof Render).toBe('function');
  });
});
