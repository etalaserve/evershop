import { buildDocumentSaveOp } from '../../documentOps.js';
import { inferOpType } from '../../../../modules/pageBuilder/services/applyOperationToSource.js';

const DOC_A = { root: { props: {} }, content: [{ type: 'banner', props: { id: 'a' } }] };
const DOC_B = { root: { props: {} }, content: [{ type: 'banner', props: { id: 'b' } }] };
const UUID = '11111111-2222-3333-4444-555555555555';

describe('buildDocumentSaveOp', () => {
  it('targets the document by its cms:puck_document urn', () => {
    const op = buildDocumentSaveOp({
      uuid: UUID,
      route: 'homepage',
      scopeUrn: null,
      previous: null,
      next: DOC_A
    });
    expect(op.entityUrn).toBe(`urn:evershop:cms:puck_document:${UUID}`);
    expect(op.route).toBe('homepage');
  });

  it('produces an INSERT when no document existed', () => {
    // The whole changeset system infers op type from payload nullness, so
    // this is the contract that decides whether publish creates or updates.
    const op = buildDocumentSaveOp({
      uuid: UUID,
      route: 'homepage',
      scopeUrn: null,
      previous: null,
      next: DOC_A
    });
    expect(op.oldPayload).toBeNull();
    expect(inferOpType(op.oldPayload, op.newPayload)).toBe('INSERT');
  });

  it('produces an UPDATE once a document exists', () => {
    const op = buildDocumentSaveOp({
      uuid: UUID,
      route: 'homepage',
      scopeUrn: null,
      previous: DOC_A,
      next: DOC_B
    });
    expect(inferOpType(op.oldPayload, op.newPayload)).toBe('UPDATE');
    expect(op.oldPayload?.data).toEqual(DOC_A);
    expect(op.newPayload?.data).toEqual(DOC_B);
  });

  it('carries the whole document on both sides, not a patch', () => {
    // Snapshots are what make publish idempotent and a cursor move a seek
    // rather than a fold. A payload carrying only the changed subtree would
    // still "work" until the first undo.
    const op = buildDocumentSaveOp({
      uuid: UUID,
      route: 'homepage',
      scopeUrn: null,
      previous: DOC_A,
      next: DOC_B
    });
    expect(op.newPayload).toEqual({
      route: 'homepage',
      scope_urn: null,
      data: DOC_B
    });
  });

  it('records the entity scope on both payloads', () => {
    // scope_urn is how an entity-scoped document (one landing page) is kept
    // distinct from the route default; losing it on either side would make
    // publish write over the route-wide document.
    const scope = 'urn:evershop:promotion:landing_page:abc';
    const op = buildDocumentSaveOp({
      uuid: UUID,
      route: 'landingPageView',
      scopeUrn: scope,
      previous: DOC_A,
      next: DOC_B
    });
    expect(op.oldPayload?.scope_urn).toBe(scope);
    expect(op.newPayload?.scope_urn).toBe(scope);
  });
});
