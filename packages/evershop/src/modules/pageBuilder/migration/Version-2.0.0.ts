import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Puck migration, phase 1 — storage only. Creates `puck_document`, which
 * holds one Puck `Data` document per (route, scope, theme).
 *
 * Nothing reads this table yet. The storefront still renders from
 * `widget_instance` / `widget_placement`, and those tables are deliberately
 * left untouched: they stay the source of truth until the cutover, and are
 * only dropped a full release later. This migration is therefore additive
 * and safe to ship on its own.
 *
 * ## Why a new table rather than reshaping the widget tables
 *
 * Puck's unit of storage is a whole-page document (`{ content: [], root: {} }`)
 * with children nested inside their parent's props. The widget tables model
 * the same content as flat rows joined by a string-encoded parent uuid in
 * `widget_placement.area`. Those are different enough shapes that migrating in
 * place would mean rewriting every reader mid-flight; a separate table lets
 * both exist during the conversion.
 *
 * ## `scope_urn`, deliberately not `entity_urn`
 *
 * `widget_placement.entity_urn` and `changeset_operation.entity_urn` mean
 * different things — the former scopes a placement to one entity (a specific
 * landing page), the latter names the *target* of an operation. A Puck
 * document is itself an op target (`cms:puck_document:<uuid>`), so reusing
 * `entity_urn` for its scope would collide with that meaning in the very
 * queries that join the two. Named `scope_urn` so the distinction is visible
 * at the call site.
 *
 * ## Theme
 *
 * Mirrors the widget tables' theme model exactly (spec 04 § 9.2): NULL is its
 * own bucket meaning "no custom theme", and every read filters with
 * `IS NOT DISTINCT FROM` so NULL = NULL compares equal. The uniqueness
 * constraint uses the same `COALESCE(x, '')` trick `widget_placement_unique`
 * already uses, because a plain UNIQUE treats NULLs as distinct and would
 * happily allow duplicate route-level documents.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `CREATE TABLE puck_document (
      puck_document_id INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      route VARCHAR(255) NOT NULL,
      scope_urn VARCHAR(255) NULL,
      theme TEXT NULL,
      data JSONB NOT NULL DEFAULT '{"content":[],"root":{"props":{}}}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT puck_document_uuid_key UNIQUE (uuid)
    )`
  );

  // One document per (route, scope, theme). COALESCE because both scope_urn
  // and theme are nullable and NULLs never collide under a plain UNIQUE —
  // same reasoning as widget_placement_unique in cms/Version-1.3.0.
  await execute(
    connection,
    `CREATE UNIQUE INDEX puck_document_unique
       ON puck_document(route, COALESCE(scope_urn, ''), COALESCE(theme, ''))`
  );

  // The storefront read is always "the document for this route in the active
  // theme"; scope is resolved from the matched entity afterwards.
  await execute(
    connection,
    `CREATE INDEX idx_puck_document_theme_route ON puck_document(theme, route)`
  );
};
