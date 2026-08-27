import { getDb } from './db.js';

/**
 * Snapshot/restore for `puck_document`.
 *
 * Specs need a clean slate for the route they exercise, but this table holds
 * REAL content on any store that has run the backfill — a developer's actual
 * pages. Deleting rows outright, which several specs used to do, silently
 * destroyed that content as a side effect of running the tests.
 *
 * Snapshotting the whole table rather than one route is deliberate: the
 * backfill converts every route that has widgets, so a spec that only
 * restored its own route would still leak documents the backfill created for
 * others.
 */
export interface PuckDocumentSnapshot {
  route: string;
  scope_urn: string | null;
  theme: string | null;
  data: unknown;
}

export async function snapshotPuckDocuments(): Promise<PuckDocumentSnapshot[]> {
  const { rows } = await getDb().query<PuckDocumentSnapshot>(
    `SELECT route, scope_urn, theme, data FROM puck_document`
  );
  return rows;
}

export async function restorePuckDocuments(
  snapshot: PuckDocumentSnapshot[]
): Promise<void> {
  const db = getDb();
  await db.query(`DELETE FROM puck_document`);
  for (const doc of snapshot) {
    await db.query(
      `INSERT INTO puck_document (route, scope_urn, theme, data)
       VALUES ($1, $2, $3, $4)`,
      [doc.route, doc.scope_urn, doc.theme, doc.data]
    );
  }
}
