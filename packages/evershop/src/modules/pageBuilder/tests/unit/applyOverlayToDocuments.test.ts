/**
 * Overlay conflict rules for `puck_document`.
 *
 * Mirrors applyOverlayToWidgets.test.ts in shape, but the rules differ where
 * the data model differs — documents are atomic, so there is no referential
 * integrity to preserve and last-writer-wins is the whole semantic. The cases
 * that matter are ordering, cross-type isolation during the cutover, and the
 * one place this deliberately diverges from the widget overlay (UPDATE on a
 * missing document).
 */

import {
  applyOverlayToDocuments,
  type OverlayDocument
} from '../../services/applyOverlayToDocuments.js';
import type { ChangesetOperationRow } from '../../../../types/db/index.js';

const DOC_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const DOC_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const WIDGET_X = 'cccccccc-3333-4333-8333-cccccccccccc';

const docUrn = (uuid: string) => `urn:evershop:cms:puck_document:${uuid}`;
const widgetUrn = (uuid: string) => `urn:evershop:cms:widget_instance:${uuid}`;

let order = 0;
function op(
  entity_urn: string,
  old_payload: unknown,
  new_payload: unknown
): ChangesetOperationRow {
  order += 1;
  return {
    changeset_operation_id: order,
    uuid: `op-${order}`,
    changeset_id: 1,
    route: 'homepage',
    entity_urn,
    old_payload,
    new_payload,
    change_order: order,
    created_at: new Date()
  } as unknown as ChangesetOperationRow;
}

const body = (heading: string) => ({
  content: [{ type: 'banner', props: { id: DOC_A, heading } }],
  root: { props: {} }
});

const doc = (uuid: string, heading: string): OverlayDocument => ({
  uuid,
  route: 'homepage',
  scope_urn: null,
  data: body(heading)
});

beforeEach(() => {
  order = 0;
});

describe('applyOverlayToDocuments', () => {
  it('INSERT adds a document that was not in source', () => {
    const map = new Map<string, OverlayDocument>();
    applyOverlayToDocuments(map, [
      op(docUrn(DOC_A), null, {
        route: 'homepage',
        scope_urn: null,
        data: body('inserted')
      })
    ]);
    expect(map.size).toBe(1);
    expect((map.get(DOC_A)!.data as any).content[0].props.heading).toBe('inserted');
    expect(map.get(DOC_A)!.uuid).toBe(DOC_A);
  });

  it('UPDATE replaces the document body wholesale', () => {
    const map = new Map([[DOC_A, doc(DOC_A, 'original')]]);
    applyOverlayToDocuments(map, [
      op(docUrn(DOC_A), { data: body('original') }, {
        route: 'homepage',
        scope_urn: null,
        data: body('updated')
      })
    ]);
    expect((map.get(DOC_A)!.data as any).content[0].props.heading).toBe('updated');
  });

  it('DELETE removes the key entirely, so the route renders as having no document', () => {
    const map = new Map([[DOC_A, doc(DOC_A, 'original')]]);
    applyOverlayToDocuments(map, [
      op(docUrn(DOC_A), { data: body('original') }, null)
    ]);
    expect(map.has(DOC_A)).toBe(false);
  });

  it('applies ops in change_order — the last write wins, not the last listed', () => {
    const map = new Map<string, OverlayDocument>();
    const first = op(docUrn(DOC_A), null, {
      route: 'homepage',
      scope_urn: null,
      data: body('first')
    });
    const second = op(docUrn(DOC_A), { data: body('first') }, {
      route: 'homepage',
      scope_urn: null,
      data: body('second')
    });
    // Deliberately reversed: the engine must not trust caller ordering.
    applyOverlayToDocuments(map, [second, first]);
    expect((map.get(DOC_A)!.data as any).content[0].props.heading).toBe('second');
  });

  it('DELETE then re-INSERT within one changeset ends up present', () => {
    const map = new Map([[DOC_A, doc(DOC_A, 'original')]]);
    applyOverlayToDocuments(map, [
      op(docUrn(DOC_A), { data: body('original') }, null),
      op(docUrn(DOC_A), null, {
        route: 'homepage',
        scope_urn: null,
        data: body('revived')
      })
    ]);
    expect((map.get(DOC_A)!.data as any).content[0].props.heading).toBe('revived');
  });

  it('ignores widget ops, so a changeset spanning both models applies cleanly', () => {
    // This is the cutover case: one changeset can hold widget ops written
    // before the switch and document ops written after. Each overlay must see
    // only its own.
    const map = new Map([[DOC_A, doc(DOC_A, 'original')]]);
    applyOverlayToDocuments(map, [
      op(widgetUrn(WIDGET_X), null, { type: 'banner', settings: {} }),
      op(docUrn(DOC_A), { data: body('original') }, {
        route: 'homepage',
        scope_urn: null,
        data: body('updated')
      })
    ]);
    expect(map.size).toBe(1);
    expect((map.get(DOC_A)!.data as any).content[0].props.heading).toBe('updated');
  });

  it('leaves documents the changeset never touches alone', () => {
    const map = new Map([
      [DOC_A, doc(DOC_A, 'a')],
      [DOC_B, doc(DOC_B, 'b')]
    ]);
    applyOverlayToDocuments(map, [
      op(docUrn(DOC_A), { data: body('a') }, {
        route: 'homepage',
        scope_urn: null,
        data: body('a2')
      })
    ]);
    expect((map.get(DOC_B)!.data as any).content[0].props.heading).toBe('b');
  });

  it('materializes an UPDATE whose target is missing, unlike the widget overlay', () => {
    // applyOverlayToWidgets skips this case so a competing publish's DELETE
    // wins. Here the op carries the ENTIRE document, so there is nothing to
    // merge into and nothing to lose — and skipping would blank a page whose
    // row was concurrently replaced, which is the worse outcome.
    const map = new Map<string, OverlayDocument>();
    applyOverlayToDocuments(map, [
      op(docUrn(DOC_A), { data: body('gone') }, {
        route: 'homepage',
        scope_urn: null,
        data: body('restored')
      })
    ]);
    expect((map.get(DOC_A)!.data as any).content[0].props.heading).toBe('restored');
  });

  it('preserves scope_urn so entity-scoped documents stay distinguishable', () => {
    const map = new Map<string, OverlayDocument>();
    applyOverlayToDocuments(map, [
      op(docUrn(DOC_B), null, {
        route: 'landingPageView',
        scope_urn: 'urn:evershop:promotion:landing_page:xyz',
        data: body('scoped')
      })
    ]);
    expect(map.get(DOC_B)!.scope_urn).toBe(
      'urn:evershop:promotion:landing_page:xyz'
    );
    expect(map.get(DOC_B)!.route).toBe('landingPageView');
  });
});
