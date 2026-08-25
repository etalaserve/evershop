import { useState } from 'react';
import type { ReactElement } from 'react';

import { ImageUploader } from '~/components/admin/ImageUploader.js';
import { Input } from '~/components/ui/input.js';
import { Label } from '~/components/ui/label.js';
import { Switch } from '~/components/ui/switch.js';
import { Textarea } from '~/components/ui/textarea.js';
import type { CustomFieldRenderers } from '../../../../lib/puck/buildFields.js';

/**
 * The four field kinds Puck has no primitive for, as Puck `custom` renderers.
 *
 * These are **injected** into `buildPuckConfig()` rather than imported by it
 * (see `lib/puck/buildFields.ts`): the storefront renders documents through
 * `@puckeditor/core/rsc`, which never touches field UI, so importing them from
 * the generator would drag `ImageUploader` and the shadcn primitives into the
 * storefront bundle for markup that is never produced. Only the editor passes
 * this object.
 *
 * Each renderer is a port of the matching branch in
 * `components/page-builder-admin/SettingsForm.tsx` — same controls, same
 * value semantics — so switching a merchant onto the Puck editor does not
 * silently change what a field accepts or writes.
 *
 * Two Puck behaviours shape these (both verified against 0.23.0's built
 * output, not just its docs):
 *
 *  - Puck renders a `custom` field's `render` directly inside a bare `div`
 *    with **no label wrapper** of its own, unlike its built-in field types.
 *    Each renderer therefore emits its own `<Label>`, matching what
 *    `SettingsForm`'s `FieldRow` does today. Omitting it yields an unlabelled
 *    control rather than a visibly broken one, which is exactly the kind of
 *    thing that ships unnoticed.
 *  - A `custom` field whose `render` is absent renders `null` — Puck checks
 *    for it rather than throwing. That is what makes the server-side omission
 *    safe, and it means a future renderer added to `buildFields.ts` but
 *    forgotten here degrades to an invisible field. If a field ever goes
 *    missing in the editor, look here first.
 */

/** Puck's `CustomFieldRender` props, narrowed to what these renderers use. */
interface RenderProps<T> {
  field: { label?: string };
  value: T;
  onChange: (value: T) => void;
  readOnly?: boolean;
}

function FieldShell({
  label,
  children
}: {
  label?: string;
  children: React.ReactNode;
}): ReactElement {
  return (
    <div className="space-y-1.5">
      {label ? <Label>{label}</Label> : null}
      {children}
    </div>
  );
}

function ToggleField({
  field,
  value,
  onChange,
  readOnly
}: RenderProps<boolean>): ReactElement {
  return (
    <FieldShell label={field.label}>
      <Switch
        checked={!!value}
        disabled={readOnly}
        onCheckedChange={(checked) => onChange(checked)}
      />
    </FieldShell>
  );
}

function ColorField({
  field,
  value,
  onChange,
  readOnly
}: RenderProps<string>): ReactElement {
  // Paired swatch + free text: the swatch is the convenient path, the text
  // input is the capable one. `<input type="color">` only accepts `#rrggbb`,
  // but the stored value may legitimately be any CSS colour (`transparent`,
  // `hsl(...)`, a `var(--token)`), so the swatch falls back to black for
  // display and never rewrites a value the merchant did not touch.
  const isHex = typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <FieldShell label={field.label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isHex ? value : '#000000'}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 rounded border border-input"
        />
        <Input
          value={value ?? ''}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#rrggbb or CSS color"
        />
      </div>
    </FieldShell>
  );
}

function ImageField({
  field,
  value,
  onChange
}: RenderProps<string>): ReactElement {
  return (
    <FieldShell label={field.label}>
      <ImageUploader value={value ?? ''} onChange={onChange} />
    </FieldShell>
  );
}

function JsonField({
  field,
  value,
  onChange,
  readOnly
}: RenderProps<unknown>): ReactElement {
  // The draft string is held HERE, not derived from `value`, and `onChange`
  // fires only on a successful parse. Puck's sidebar is live — writing every
  // keystroke through would push unparseable fragments into props (and, via
  // the debounced save, into a changeset op) on the way to every valid value.
  // Keeping the draft local also stops a re-render from reformatting the text
  // out from under someone mid-edit.
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [error, setError] = useState<string | null>(null);

  return (
    <FieldShell label={field.label}>
      <Textarea
        value={text}
        rows={4}
        disabled={readOnly}
        spellCheck={false}
        className="font-mono text-xs"
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setError(null);
          } catch {
            setError('Invalid JSON');
          }
        }}
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </FieldShell>
  );
}

/** Pass to `buildPuckConfig({ customFields: PUCK_CUSTOM_FIELDS })` in the editor only. */
export const PUCK_CUSTOM_FIELDS: CustomFieldRenderers = {
  toggle: ToggleField as (props: unknown) => unknown,
  color: ColorField as (props: unknown) => unknown,
  image: ImageField as (props: unknown) => unknown,
  json: JsonField as (props: unknown) => unknown
};
