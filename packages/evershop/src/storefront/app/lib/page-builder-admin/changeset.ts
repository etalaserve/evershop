import { getActiveTheme } from '../../../../lib/util/getActiveTheme.js';
import { getOrCreateDraftChangeset } from '../../../../modules/pageBuilder/services/getOrCreateDraftChangeset.js';

/**
 * Server-side only — mirrors the legacy `pageBuilderEdit/index.ts` loader's
 * entry logic exactly (same service, same "one open draft per admin+theme"
 * semantics). Direct import, not REST — `getOrCreateDraftChangeset` has no
 * REST/GraphQL surface of its own (`POST /api/page-builder/changesets`
 * always creates a new row; only this internal service has get-or-create
 * behavior), and every other admin route in this app already reaches
 * straight into EverShop's own service functions rather than round-tripping
 * through GraphQL for server-side reads.
 */
export async function getOrCreateDraft(userId: number) {
  return getOrCreateDraftChangeset({ userId, theme: getActiveTheme() });
}
