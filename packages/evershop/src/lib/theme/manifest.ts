import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { validateManifestMetafieldDefinitions } from '../metafield/provision.js';
import type { ManifestMetafieldDefinition } from '../metafield/provision.js';
import { isValidVersion } from './version.js';

/**
 * Theme manifest (`theme.json`) reader + validator — spec 04 § 5.
 *
 * Per the 2026-06-06 decision (spec § 5.5), widget-type-registry and
 * settings-schema validation are deferred to render time: the CLI never
 * bootstraps the widget registry, so it validates structure + DB-collision
 * only and emits a non-blocking soft warning for never-before-seen types.
 */

export interface WidgetRecord {
  uuid: string;
  type: string;
  name: string;
  settings: Record<string, unknown>;
}

export interface PlacementRecord {
  uuid: string;
  widget_instance_uuid: string;
  route: string;
  area: string;
  sort_order: number;
}

/**
 * One Puck document a theme ships — the schema-2 unit of content.
 *
 * Replaces the widget/placement pair: a document already carries its own
 * nesting and ordering, so the cross-record integrity rules that existed to
 * stop a placement referencing a missing widget have nothing to check.
 */
export interface DocumentRecord {
  route: string;
  /** Entity scope, or null for the route's default document. */
  scope_urn?: string | null;
  /** A Puck `Data` — `{ root, content }`. */
  data: unknown;
}

export interface Manifest {
  theme_name: string;
  /**
   * Content schema version. Absent means 1, so every theme published before
   * the Puck migration keeps installing untouched — that reader is retained
   * permanently, not as a deprecation window: a theme is an artefact someone
   * else published and we do not get to expire it.
   *
   * A schema-1 manifest is CONVERTED to documents at install time rather than
   * writing widget rows, so both kinds of theme produce the same thing and
   * there is only one install path to keep correct.
   */
  schema?: 1 | 2;
  /**
   * The theme content's version — a valid SemVer string (spec 04 § 5.2).
   * Load-bearing: installs/upgrades are gated on it (only a strictly higher
   * version upgrades; downgrades are refused). See `install.ts`.
   */
  version: string;
  /** Schema 1 only. */
  widgets?: WidgetRecord[];
  /** Schema 1 only. */
  placements?: PlacementRecord[];
  /** Schema 2 only. */
  documents?: DocumentRecord[];
  /**
   * Metafield definitions this theme declares (theme-metafields design).
   * Deliberately OUTSIDE the widget SemVer/snapshot protocol: entries are
   * ensured idempotently at `theme:active` and every server boot
   * (`lib/metafield/provision.ts`) — no version bump needed for changes.
   */
  metafieldDefinitions?: ManifestMetafieldDefinition[];
}

export interface ValidationError {
  scope:
    | 'top-level'
    | 'widget'
    | 'placement'
    | 'document'
    | 'cross-record'
    | 'db'
    | 'metafield';
  index?: number;
  uuid?: string;
  message: string;
}

export interface ValidationContext {
  themeId: string;
  pool: Pool;
}

const SYNTHETIC_AREA_RE = /^columnsContainer_([0-9a-fA-F-]+)_col_\d+$/;

function isUuidV4(value: unknown): value is string {
  return (
    typeof value === 'string' && uuidValidate(value) && uuidVersion(value) === 4
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Read a theme's `theme.json` from its directory. Returns `null` when the file
 * doesn't exist (theme-without-content, spec § 5.1). Throws on unreadable or
 * malformed JSON — the CLI surfaces that as an activation failure.
 */
export async function readManifest(themeDir: string): Promise<Manifest | null> {
  const file = path.join(themeDir, 'theme.json');
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  try {
    return JSON.parse(raw) as Manifest;
  } catch (err) {
    throw new Error(
      `theme.json at ${file} is not valid JSON: ${(err as Error).message}`
    );
  }
}

/**
 * Which content schema a manifest uses.
 *
 * Inferred rather than demanded, because every theme published before the
 * Puck migration predates the field and must keep installing. An explicit
 * `schema` wins; otherwise the presence of `documents` marks a schema-2
 * manifest, and anything else is schema 1 — including a manifest with no
 * content at all, which stays schema 1 so its (empty) install path is the
 * long-standing one.
 */
export function manifestSchema(manifest: Manifest): 1 | 2 {
  if (manifest.schema === 2) return 2;
  if (manifest.schema === 1) return 1;
  return Array.isArray(manifest.documents) ? 2 : 1;
}

/**
 * Validate a manifest against spec § 5.5. Returns every error found (empty
 * array = pass) so the CLI can print them all at once.
 */
export async function validateManifest(
  manifest: Manifest,
  ctx: ValidationContext
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Top-level. `theme_name` is intentionally NOT validated (§ 5.5 — free-form
  // display name). `version` IS required and must be valid SemVer (§ 5.2): it
  // gates install/upgrade ordering, so a malformed value (`""`, `"1.2"`,
  // `"abc"`) is rejected. `widgets`/`placements` must be arrays or the rest
  // can't run.
  if (!isValidVersion(manifest.version)) {
    errors.push({
      scope: 'top-level',
      message: `version must be a valid SemVer string (e.g. "1.2.0"); got ${JSON.stringify(
        (manifest as { version?: unknown }).version
      )}`
    });
  }
  if (manifestSchema(manifest) === 2) {
    // Schema 2 carries documents instead of widget/placement pairs. There are
    // no cross-record rules to enforce: a document already contains its own
    // nesting and ordering, so the whole class of "placement references a
    // widget that isn't here" cannot arise.
    if (!Array.isArray(manifest.documents)) {
      errors.push({
        scope: 'top-level',
        message: 'documents must be an array for a schema 2 manifest'
      });
      return errors;
    }
    manifest.documents.forEach((doc, index) => {
      if (typeof doc?.route !== 'string' || doc.route.length === 0) {
        errors.push({
          scope: 'document',
          index,
          message: 'route is required and must be a non-empty string'
        });
      }
      if (
        doc?.scope_urn !== undefined &&
        doc.scope_urn !== null &&
        typeof doc.scope_urn !== 'string'
      ) {
        errors.push({
          scope: 'document',
          index,
          message: 'scope_urn must be a string or null'
        });
      }
      // `data` is checked for SHAPE only. Whether each component type is
      // registered is a render-time concern, exactly as widget settings
      // schemas were: a theme may legitimately ship content for a component
      // an extension provides.
      const data = doc?.data as { content?: unknown } | undefined;
      if (!data || typeof data !== 'object' || !Array.isArray(data.content)) {
        errors.push({
          scope: 'document',
          index,
          message: 'data must be a Puck document with a content array'
        });
      }
    });
    return errors;
  }

  const widgetsOk = Array.isArray(manifest.widgets);
  const placementsOk = Array.isArray(manifest.placements);
  // Narrowed once for the whole schema-1 section below. Both are optional on
  // the type because a schema-2 manifest carries neither; reaching here means
  // this manifest is schema 1, where a missing array is already reported as a
  // top-level error just above.
  const widgets = manifest.widgets ?? [];
  const placements = manifest.placements ?? [];
  if (!widgetsOk) {
    errors.push({ scope: 'top-level', message: 'widgets must be an array' });
  }
  if (!placementsOk) {
    errors.push({ scope: 'top-level', message: 'placements must be an array' });
  }
  // Metafield definitions (optional section). Structure is checked by the
  // strict schema in lib/metafield/provision.ts — including the refusal of
  // `required: true`, which would break every entity save store-wide.
  if (manifest.metafieldDefinitions !== undefined) {
    const mfd = validateManifestMetafieldDefinitions(
      manifest.metafieldDefinitions
    );
    for (const e of mfd.errors) {
      errors.push({
        scope: 'metafield',
        index: e.index >= 0 ? e.index : undefined,
        message: e.message
      });
    }
  }

  // Only bail early when we can't iterate; otherwise collect all errors.
  if (!widgetsOk || !placementsOk) return errors;

  const widgetUuids = new Set<string>();
  (widgets ?? []).forEach((w, index) => {
    if (!isUuidV4(w?.uuid)) {
      errors.push({
        scope: 'widget',
        index,
        uuid: typeof w?.uuid === 'string' ? w.uuid : undefined,
        message: `widget[${index}].uuid is not a valid UUID v4`
      });
    }
    if (!isNonEmptyString(w?.type)) {
      errors.push({
        scope: 'widget',
        index,
        message: `widget[${index}].type must be a non-empty string`
      });
    }
    if (!isPlainObject(w?.settings)) {
      errors.push({
        scope: 'widget',
        index,
        message: `widget[${index}].settings must be a plain object`
      });
    }
    if (isUuidV4(w?.uuid)) widgetUuids.add(w.uuid);
  });

  const placementUuids = new Set<string>();
  (placements ?? []).forEach((p, index) => {
    if (!isUuidV4(p?.uuid)) {
      errors.push({
        scope: 'placement',
        index,
        uuid: typeof p?.uuid === 'string' ? p.uuid : undefined,
        message: `placement[${index}].uuid is not a valid UUID v4`
      });
    }
    if (!widgetUuids.has(p?.widget_instance_uuid)) {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].widget_instance_uuid '${p?.widget_instance_uuid}' has no matching widget in widgets[]`
      });
    }
    if (!isNonEmptyString(p?.route)) {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].route must be a non-empty string`
      });
    }
    if (!isNonEmptyString(p?.area)) {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].area must be a non-empty string`
      });
    }
    if (typeof p?.sort_order !== 'number' || !Number.isFinite(p.sort_order)) {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].sort_order must be a finite number`
      });
    }
    if (
      (p as { entity_urn?: unknown })?.entity_urn !== undefined &&
      (p as { entity_urn?: unknown }).entity_urn !== null
    ) {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].entity_urn must be absent or null (theme manifests carry route-level placements only)`
      });
    }
    if (isUuidV4(p?.uuid)) placementUuids.add(p.uuid);
  });

  // Cross-record uniqueness: no dup widget uuids, no dup placement uuids, and
  // no uuid appearing in both arrays.
  if (widgetUuids.size !== widgets.filter((w) => isUuidV4(w?.uuid)).length) {
    errors.push({
      scope: 'cross-record',
      message: 'duplicate uuid(s) within widgets[]'
    });
  }
  if (
    placementUuids.size !==
    placements.filter((p) => isUuidV4(p?.uuid)).length
  ) {
    errors.push({
      scope: 'cross-record',
      message: 'duplicate uuid(s) within placements[]'
    });
  }
  for (const u of placementUuids) {
    if (widgetUuids.has(u)) {
      errors.push({
        scope: 'cross-record',
        uuid: u,
        message: `uuid '${u}' is used by both a widget and a placement`
      });
    }
  }

  // Synthetic-area parent: a child placement's area encodes its parent
  // container's uuid, which must exist in widgets[] and be a `columns` widget.
  const widgetTypeByUuid = new Map(
    widgets
      .filter((w) => isUuidV4(w?.uuid))
      .map((w) => [w.uuid, w.type])
  );
  (placements ?? []).forEach((p, index) => {
    const match = typeof p?.area === 'string' && p.area.match(SYNTHETIC_AREA_RE);
    if (!match) return;
    const parentUuid = match[1];
    if (!widgetUuids.has(parentUuid)) {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].area references parent widget '${parentUuid}' which is not in widgets[]`
      });
    } else if (widgetTypeByUuid.get(parentUuid) !== 'columns') {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].area parent '${parentUuid}' must be a 'columns' widget (is '${widgetTypeByUuid.get(parentUuid)}')`
      });
    }
  });

  // DB collision: a widget uuid that already exists under a DIFFERENT theme
  // can't be claimed by this install.
  const dbUuids = widgets
    .map((w) => w?.uuid)
    .filter((u): u is string => isUuidV4(u));
  if (dbUuids.length > 0) {
    const { rows } = await ctx.pool.query(
      `SELECT uuid::text AS uuid, theme FROM widget_instance WHERE uuid::text = ANY($1::text[])`,
      [dbUuids]
    );
    const existingTheme = new Map<string, string | null>(
      rows.map((r: { uuid: string; theme: string | null }) => [
        r.uuid,
        r.theme ?? null
      ])
    );
    for (const w of widgets) {
      if (!isUuidV4(w?.uuid)) continue;
      const t = existingTheme.get(w.uuid);
      if (t !== undefined && t !== ctx.themeId) {
        errors.push({
          scope: 'db',
          uuid: w.uuid,
          message: `widget '${w.uuid}' already exists under theme '${t}', cannot install it under '${ctx.themeId}'`
        });
      }
    }
  }

  return errors;
}

/**
 * Non-blocking soft warning (spec § 5.5): warn for any manifest widget type
 * that has never been instantiated on this install. A fresh module install
 * legitimately introduces new types, so this is a hint, not an error.
 */
export function warnUnknownTypes(
  manifest: Manifest,
  knownTypes: Set<string>,
  warn: (message: string) => void
): void {
  if (knownTypes.size === 0) return; // empty DB — can't tell typos from new modules
  // Schema 2 ships documents, not widget records, so there are no declared
  // types to warn about here.
  for (const w of manifest.widgets ?? []) {
    if (!knownTypes.has(w.type)) {
      warn(
        `[WARN] widget type '${w.type}' has never been used on this install. ` +
          `If you're installing the module that provides it for the first time, ` +
          `ignore this — otherwise it may be a typo in theme.json.`
      );
    }
  }
}
