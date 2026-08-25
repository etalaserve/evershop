/**
 * Structural input contract for the mapper.
 *
 * Deliberately looser than the storefront's `FieldConfig` union rather than a
 * copy of it: the storefront app (`src/storefront/**`) is a Vite bundle and is
 * never compiled into `dist/`, so anything importing from it is unreachable to
 * the unit-test runner, which globs `dist/**\/tests/**`. Field mapping is the
 * riskiest part of the config generator and has no other verification — the
 * byte-diff harness compares rendered output, and fields are editor UI — so it
 * lives here where it can actually be tested.
 *
 * Accepting a general shape instead of re-declaring the union means there is
 * no enum to keep in sync; the storefront's specific `FieldConfig` is
 * assignable to this, and an unrecognised `type` throws rather than being
 * silently skipped.
 */
export interface FieldConfigInput {
  key: string;
  label: string;
  type: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  itemFields?: FieldConfigInput[];
  defaultItem?: Record<string, unknown>;
  itemLabel?: string;
}

/**
 * Translate EverShop's `fieldConfig.ts` vocabulary into Puck fields.
 *
 * `fieldConfig.ts` stays the single source of truth — it is hand-authored to
 * mirror each widget's `rawSettings`, and generating from it means a widget
 * author still edits one file and third-party `registerStorefrontWidget()`
 * callers keep working. Hand-writing 28 Puck component definitions would fork
 * that source of truth permanently.
 *
 * Four of the nine types have no Puck primitive and become `custom` fields.
 * Their UI is **injected**, not imported: the storefront renders documents
 * server-side via `@puckeditor/core/rsc`, which never touches field UI, so
 * pulling admin React components (ImageUploader, shadcn Switch) in here would
 * drag the whole admin surface into the storefront bundle for no reason. The
 * editor passes real renderers; `Render` passes none.
 */

/** Minimal shape of a Puck field — deliberately loose, since Puck's own types are heavily generic. */
export type PuckField = Record<string, unknown>;

/** The four `fieldConfig` types with no Puck primitive. */
export type CustomFieldKind = 'toggle' | 'color' | 'image' | 'json';

/**
 * Renderers for the custom field kinds, supplied by the editor. Omitted on the
 * server: a `custom` field with no `render` is never exercised by `Render`,
 * which only reads `components[].render`.
 */
export type CustomFieldRenderers = Partial<
  Record<CustomFieldKind, (props: unknown) => unknown>
>;

function customField(
  kind: CustomFieldKind,
  label: string,
  renderers: CustomFieldRenderers
): PuckField {
  const render = renderers[kind];
  return render ? { type: 'custom', label, render } : { type: 'custom', label };
}

/**
 * Map one `fieldConfig` entry to a Puck field.
 *
 * `text` / `textarea` / `number` / `select` are 1:1 — together they cover
 * ~153 of the 209 field occurrences across the 27 configured widget types.
 */
function mapField(field: FieldConfigInput, renderers: CustomFieldRenderers): PuckField {
  switch (field.type) {
    case 'text':
      return { type: 'text', label: field.label };
    case 'textarea':
      return { type: 'textarea', label: field.label };
    case 'number':
      return {
        type: 'number',
        label: field.label,
        ...(field.min !== undefined ? { min: field.min } : {}),
        ...(field.max !== undefined ? { max: field.max } : {}),
        ...(field.step !== undefined ? { step: field.step } : {})
      };
    case 'select':
      // Shapes already match — Puck also wants `{ label, value }`.
      return {
        type: 'select',
        label: field.label,
        options: (field.options ?? []).map((o) => ({ label: o.label, value: o.value }))
      };

    // Puck has no boolean field at all; `radio` with true/false is a UX
    // downgrade from the shadcn Switch that exists today, so keep the Switch.
    case 'toggle':
      return customField('toggle', field.label, renderers);
    // No colour field either. The current control is a paired swatch +
    // free-text input that accepts any CSS colour, which a plain text field
    // would lose.
    case 'color':
      return customField('color', field.label, renderers);
    // No media field. Wraps the existing ImageUploader, which already POSTs
    // to /admin/uploads and is a clean {value, onChange} component.
    case 'image':
      return customField('image', field.label, renderers);
    // No JSON field. The renderer must hold its own draft string and only
    // call onChange on a valid parse — Puck's sidebar is live, so writing an
    // unparseable string straight into props would break the canvas on every
    // keystroke.
    case 'json':
      return customField('json', field.label, renderers);

    case 'array':
      return {
        type: 'array',
        label: field.label,
        arrayFields: nestFlatFields(field.itemFields ?? [], renderers),
        // A function, not a static object — this is what lets each added item
        // get a fresh uuid, exactly as SettingsForm.tsx does today. Puck's
        // signature is `Props[0] | ((index: number) => Props[0])`.
        defaultItemProps: () => ({
          ...(field.defaultItem ?? {}),
          ...(hasIdKey(field.defaultItem ?? {}) ? { id: newId() } : {})
        }),
        ...(field.itemLabel
          ? { getItemSummary: itemSummary(field.itemLabel) }
          : {})
      };
    default:
      // A new fieldConfig type must be handled here. Throwing beats returning
      // undefined, which would drop the field from the sidebar with no signal.
      throw new Error(
        `Unmapped fieldConfig type '${field.type}' for key '${field.key}'`
      );
  }
}

function hasIdKey(defaultItem: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(defaultItem, 'id');
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());
}

/** Collapsed-row title. `itemLabel` may itself be a dot-path (`parent.label`). */
function itemSummary(itemLabel: string) {
  return (item: Record<string, unknown>, index?: number): string => {
    const value = itemLabel
      .split('.')
      .reduce<unknown>((acc, part) => (acc == null ? acc : (acc as any)[part]), item);
    return typeof value === 'string' && value.length > 0
      ? value
      : `Item ${(index ?? 0) + 1}`;
  };
}

/**
 * Group a flat `FieldConfig[]` into Puck's keyed field map, turning dot-path
 * keys into nested `object` fields.
 *
 * `fieldConfig` addresses nested values with dot-paths resolved by
 * `objectPath.ts` — e.g. `trust_strip.items[].link.url` is authored as a flat
 * entry with `key: 'link.url'`. Puck instead wants
 * `link: { type: 'object', objectFields: { url, newTab } }`, matching the
 * actual prop shape. Same data, different addressing.
 *
 * Only one level of nesting is produced, because that is all `fieldConfig`
 * uses; a deeper path would need this to recurse and is asserted against
 * below rather than silently mis-nested.
 */
export function nestFlatFields(
  fields: FieldConfigInput[],
  renderers: CustomFieldRenderers = {}
): Record<string, PuckField> {
  const out: Record<string, PuckField> = {};

  for (const field of fields) {
    if (!field.key.includes('.')) {
      out[field.key] = mapField(field, renderers);
      continue;
    }

    const parts = field.key.split('.');
    if (parts.length > 2) {
      throw new Error(
        `fieldConfig key '${field.key}' nests deeper than one level; ` +
          `nestFlatFields would mis-nest it. Extend it before using this key.`
      );
    }
    const [parent, child] = parts;

    const existing = out[parent];
    if (existing && existing.type === 'object') {
      (existing.objectFields as Record<string, PuckField>)[child] = mapField(
        field,
        renderers
      );
    } else {
      out[parent] = {
        type: 'object',
        // The group has no label of its own in fieldConfig — derive a readable
        // one from the key rather than leaving it blank in the sidebar.
        label: parent.charAt(0).toUpperCase() + parent.slice(1),
        objectFields: { [child]: mapField(field, renderers) }
      };
    }
  }

  return out;
}
