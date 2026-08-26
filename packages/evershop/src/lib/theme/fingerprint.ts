import { canonicalize } from './canonicalize.js';
import type { Manifest } from './manifest.js';

/**
 * Fingerprint a manifest's CONTENT only — `widgets[]`, `placements[]` and
 * `documents[]`.
 *
 * Excludes metadata (`theme_name`, `version`, and any future
 * description/author/license fields). Used by the upgrade path to tell whether
 * a strictly-higher `version` actually changed any content (vs. a version-only
 * bump), and to warn when content drifts at an unchanged version (§ 7.1).
 *
 * Array order IS significant (canonicalize doesn't sort arrays), so reordering
 * `widgets[]` changes the fingerprint — intentional, since order can matter.
 */
export function contentFingerprint(manifest: Manifest): string {
  return canonicalize({
    widgets: manifest.widgets,
    placements: manifest.placements,
    /**
     * Schema 2's content. Without this every schema-2 manifest fingerprints
     * identically — they all have `widgets: undefined, placements: undefined`
     * — so drift at an unchanged version would go unreported for exactly the
     * themes that now carry the content.
     *
     * Included unconditionally rather than switching on the schema: a schema-1
     * manifest has no `documents` key, so the fingerprint of every existing
     * theme is unchanged and no store sees spurious drift after upgrading.
     */
    documents: manifest.documents
  });
}
