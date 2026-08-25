import React from 'react';
import { WidgetBoundary } from '~/components/widgets/WidgetBoundary.js';
import {
  nestFlatFields,
  type CustomFieldRenderers,
  type PuckField
} from '../../../../lib/puck/buildFields.js';
import { WIDGET_FIELD_CONFIGS } from '~/lib/page-builder-admin/fieldConfig.js';
import { WIDGET_PALETTE } from '~/lib/page-builder-admin/widgetPalette.js';
import { getStorefrontWidget } from '~/lib/widgets/registry.js';

/**
 * Build the Puck `Config` from EverShop's existing sources of truth:
 * `fieldConfig.ts` → fields, `widgetPalette.ts` → defaultProps + categories,
 * `registry.tsx` → render.
 *
 * Generated rather than hand-authored so a widget author keeps editing one
 * file and `registerStorefrontWidget()` extensions keep working.
 *
 * ## One component per TYPE, not per palette variant
 *
 * There are 53 palette entries over 28 types (25 types carry two variants
 * each). Components are registered per **type**, because `type` is the value
 * that gets persisted — as `widget_instance.type` today and `ComponentData.type`
 * under Puck. Registering 53 would mean 53 persisted strings, and the
 * migration could not produce them: existing rows carry only `type`, never
 * `variantId`, and for the roughly half of variants that are just a preset of
 * an existing settings axis (`layout`, `imagePosition`, `contentPosition`) the
 * two are indistinguishable once a merchant edits one field. The variants stay
 * a palette-level concern — the drawer applies a preset on insert.
 */

/** Widget types that host nested children via `columnsContainer_<uuid>_col_<n>`. */
const CONTAINER_SLOTS: Record<string, number> = {
  // Columns renders `columnCount` columns (defaults to 2). Slots are declared
  // statically because a Puck field set is fixed per component, so declare the
  // maximum the ratio parser supports; unused columns simply render empty.
  columns: 4,
  // Section is the degenerate single-column container — always `_col_0`.
  section: 1
};

export interface BuildConfigOptions {
  /**
   * Renderers for the four field kinds Puck has no primitive for. Supplied by
   * the editor; omitted on the server, where `Render` never touches field UI.
   */
  customFields?: CustomFieldRenderers;
}

export interface PuckComponentConfig {
  label?: string;
  fields: Record<string, PuckField>;
  defaultProps?: Record<string, unknown>;
  render: (props: Record<string, unknown>) => unknown;
}

export interface PuckConfig {
  components: Record<string, PuckComponentConfig>;
}

/** Slot fields for a container type, keyed `col0`, `col1`, … to mirror the synthetic area's column index. */
function slotFields(type: string): Record<string, PuckField> {
  const count = CONTAINER_SLOTS[type];
  if (!count) return {};
  const out: Record<string, PuckField> = {};
  for (let i = 0; i < count; i += 1) {
    // MUST be declared as a field. Without this Puck hands the raw child array
    // to render() and React throws "Element type is invalid… got: object" —
    // the container looks fine while dropping every child. Verified in
    // lib/puck/tests/unit/puckContract.test.ts.
    out[`col${i}`] = { type: 'slot' };
  }
  return out;
}

/**
 * First palette entry per type supplies `defaultProps` and the human label.
 * Later variants of the same type are presets applied at insert time, so their
 * defaults are not the component's baseline.
 */
function paletteDefaults(): Map<string, { label: string; defaultSettings: Record<string, unknown> }> {
  const out = new Map<string, { label: string; defaultSettings: Record<string, unknown> }>();
  for (const entry of WIDGET_PALETTE) {
    if (out.has(entry.type)) continue;
    out.set(entry.type, {
      // Palette labels carry the variant suffix ("Banner — Centered"); the
      // component label should name the type, not one of its presets.
      label: entry.label.split('—')[0].trim(),
      defaultSettings: entry.defaultSettings
    });
  }
  return out;
}

export function buildPuckConfig(opts: BuildConfigOptions = {}): PuckConfig {
  const renderers = opts.customFields ?? {};
  const defaults = paletteDefaults();
  const components: Record<string, PuckComponentConfig> = {};

  for (const [type, meta] of defaults) {
    const Component = getStorefrontWidget(type);
    // A palette entry with no registered component would render nothing.
    // `WidgetArea` already fails soft that way; surfacing it here instead
    // keeps a typo from becoming an invisible blank in the canvas.
    if (!Component) continue;

    const fieldConfig = WIDGET_FIELD_CONFIGS[type];

    components[type] = {
      label: meta.label,
      fields: {
        // `text_block` has no fieldConfig — its content is an EditorJS block
        // tree, edited through the raw-JSON escape hatch today. It still needs
        // to render, so it registers with slots only and no settings fields.
        ...(fieldConfig ? nestFlatFields(fieldConfig, renderers) : {}),
        ...slotFields(type)
      },
      defaultProps: meta.defaultSettings,
      /**
       * Bridge Puck's prop shape to the existing widget components, which are
       * reused unchanged. They expect `{ widget: { uuid, type, rawSettings, … }, extra, extras }`;
       * Puck supplies flat props plus `puck.metadata`.
       *
       * `props.id` is the original `widget_instance.uuid` (written by the
       * converter, preserved verbatim by Puck — see the contract test), which
       * is what makes the extras lookup work.
       */
      render: (props: Record<string, unknown>) => {
        const { id, puck, ...rest } = props as {
          id: string;
          puck?: { metadata?: { extras?: Record<string, unknown> } };
        } & Record<string, unknown>;
        const extras = puck?.metadata?.extras ?? {};

        // Split slot components out of the settings. Puck replaces a declared
        // slot field's value with a renderable component, so leaving `col0` in
        // `rawSettings` would hand a React component to a widget expecting a
        // plain setting.
        const slots: Record<number, React.ComponentType> = {};
        const settings: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rest)) {
          const m = /^col(\d+)$/.exec(key);
          if (m && typeof value === 'function') {
            slots[Number.parseInt(m[1], 10)] = value as React.ComponentType;
          } else {
            settings[key] = value;
          }
        }

        const widgetProps = {
          widget: {
            uuid: id,
            type,
            status: 1,
            rawSettings: settings,
            placements: [],
            // Intentionally empty: under Puck children arrive as slot
            // components, not data. Containers read `slots` instead — passing
            // `[]` here without that would render empty columns silently.
            columns: []
          },
          extra: extras[id],
          extras,
          ...(Object.keys(slots).length > 0 ? { slots } : {})
        };

        // `createElement` rather than calling `Component(...)` directly: a
        // direct call executes the component body HERE, so anything it throws
        // escapes before the boundary element exists and the boundary can
        // never catch it. As a child element the component renders inside the
        // boundary, which is what makes the per-widget isolation real. It also
        // gives each widget its own component identity, so its hooks and state
        // belong to it rather than to this bridge.
        return React.createElement(
          WidgetBoundary,
          { type, id },
          React.createElement(Component as React.ComponentType<never>, widgetProps as never)
        );
      }
    };
  }

  return { components };
}
