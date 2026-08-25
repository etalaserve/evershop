/**
 * The synthetic-area convention for container widgets.
 *
 * There is no parent FK on `widget_instance`. A child of a `columns` /
 * `section` container is an ordinary `widget_placement` row whose `area`
 * encodes its parent and column index as
 * `columnsContainer_<parentInstanceUuid>_col_<index>` (see
 * `modules/cms/migration/Version-1.3.0.ts`). The parent is identified by
 * **uuid**, never by `widget_instance_id`.
 *
 * That detail is easy to get wrong — `duplicateLandingPage` did, cloning
 * instances into fresh uuids while copying `area` verbatim, which left every
 * nested child pointing at the source page's container.
 *
 * This module is the canonical parser. Four hand-rolled copies of the same
 * regex/prefix still exist (`lib/theme/manifest.ts:64`,
 * `modules/cms/graphql/types/Widget/Widget.resolvers.js:23` and `:1145`,
 * `storefront/app/lib/page-builder-admin/localApply.ts:22`); they are
 * deliberately left alone for now rather than refactored in a bugfix, but new
 * code — notably the Puck migration's widget→document converter, which has to
 * reify these flat rows into nested slot arrays — should import from here
 * instead of adding a fifth.
 */

export const COLUMNS_AREA_PREFIX = 'columnsContainer_';

/** Matches `columnsContainer_<uuid>_col_<n>`, capturing the parent uuid and the column index. */
export const SYNTHETIC_AREA_RE = /^columnsContainer_([0-9a-fA-F-]+)_col_(\d+)$/;

export interface ColumnArea {
  parentUuid: string;
  columnIndex: number;
}

/** Parse a synthetic container area. Returns null for an ordinary area such as `content`. */
export function parseColumnArea(area: string): ColumnArea | null {
  const m = SYNTHETIC_AREA_RE.exec(area);
  if (!m) return null;
  const columnIndex = Number.parseInt(m[2], 10);
  if (!Number.isFinite(columnIndex)) return null;
  return { parentUuid: m[1], columnIndex };
}

/** Build the area id for column `columnIndex` of the container instance `parentUuid`. */
export function buildColumnArea(parentUuid: string, columnIndex: number): string {
  return `${COLUMNS_AREA_PREFIX}${parentUuid}_col_${columnIndex}`;
}

/**
 * Rewrite a synthetic area to point at a cloned parent.
 *
 * Ordinary areas pass through untouched. A synthetic area whose parent is
 * absent from `uuidMap` also passes through: that means the parent was not
 * part of the set being cloned, so the child is already orphaned at the
 * source and rewriting it would be inventing a relationship.
 */
export function remapColumnAreaParent(
  area: string,
  uuidMap: ReadonlyMap<string, string>
): string {
  const parsed = parseColumnArea(area);
  if (!parsed) return area;
  const newParent = uuidMap.get(parsed.parentUuid);
  return newParent ? buildColumnArea(newParent, parsed.columnIndex) : area;
}
