import {
  GLOBAL_REGIONS_TYPE,
  mergeGlobalsIntoRoute,
  splitGlobalRegions
} from '../../mergeGlobals.js';

function doc(content: unknown[]) {
  return { root: { props: {} }, content };
}
function c(id: string) {
  return { type: 'banner', props: { id } };
}
function regions(before: unknown[], after: unknown[]) {
  return { type: GLOBAL_REGIONS_TYPE, props: { id: 'g', before, after } };
}
const ids = (d: { content?: unknown }) =>
  (d.content as Array<{ props: { id: string } }>).map((x) => x.props.id);

describe('splitGlobalRegions', () => {
  it('reads both regions from the container', () => {
    const { before, after } = splitGlobalRegions(
      doc([regions([c('a')], [c('z')])])
    );
    expect(before.map((x) => (x.props as { id: string }).id)).toEqual(['a']);
    expect(after.map((x) => (x.props as { id: string }).id)).toEqual(['z']);
  });

  it('treats loose top-level content as "before"', () => {
    // Tolerance, not laxity: a globals document written by hand, by an older
    // backfill, or by a theme predating the container should still show its
    // content somewhere visible rather than silently rendering nothing.
    const { before, after } = splitGlobalRegions(doc([c('loose')]));
    expect(before.map((x) => (x.props as { id: string }).id)).toEqual(['loose']);
    expect(after).toEqual([]);
  });

  it('handles an absent or empty globals document', () => {
    expect(splitGlobalRegions(null)).toEqual({ before: [], after: [] });
    expect(splitGlobalRegions(doc([]))).toEqual({ before: [], after: [] });
  });
});

describe('mergeGlobalsIntoRoute', () => {
  it('puts globals around the route content, in order', () => {
    const merged = mergeGlobalsIntoRoute(
      doc([c('route1'), c('route2')]),
      doc([regions([c('top')], [c('bottom')])])
    );
    expect(ids(merged)).toEqual(['top', 'route1', 'route2', 'bottom']);
  });

  it('returns the route document untouched when there are no globals', () => {
    // Referential equality matters: this runs on every request, and the
    // overwhelmingly common case is a store with no globals at all.
    const route = doc([c('only')]);
    expect(mergeGlobalsIntoRoute(route, null)).toBe(route);
    expect(mergeGlobalsIntoRoute(route, doc([]))).toBe(route);
  });

  it('does not mutate either input', () => {
    // Both may be cached objects shared across requests; mutating one would
    // accumulate globals into it on every render.
    const route = doc([c('route1')]);
    const globals = doc([regions([c('top')], [])]);
    const before = JSON.stringify([route, globals]);
    mergeGlobalsIntoRoute(route, globals);
    expect(JSON.stringify([route, globals])).toBe(before);
  });

  it('preserves component ids exactly', () => {
    // Ids are the original widget_instance uuid and extras are keyed on them.
    // A global legitimately carries the same id on every page.
    const merged = mergeGlobalsIntoRoute(
      doc([c('route1')]),
      doc([regions([c('shared-global')], [])])
    );
    expect(ids(merged)).toContain('shared-global');
  });

  it('keeps the route document’s root props', () => {
    const merged = mergeGlobalsIntoRoute(
      { root: { props: { title: 'Home' } }, content: [] },
      doc([regions([c('top')], [])])
    );
    expect(merged.root).toEqual({ props: { title: 'Home' } });
  });

  it('works when the route has no content of its own', () => {
    const merged = mergeGlobalsIntoRoute(
      doc([]),
      doc([regions([c('top')], [c('bottom')])])
    );
    expect(ids(merged)).toEqual(['top', 'bottom']);
  });
});
