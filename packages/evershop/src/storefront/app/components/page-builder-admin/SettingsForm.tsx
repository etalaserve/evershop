import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ImageUploader } from '~/components/admin/ImageUploader.js';
import { Button } from '~/components/ui/button.js';
import { Input } from '~/components/ui/input.js';
import { Label } from '~/components/ui/label.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select.js';
import { Switch } from '~/components/ui/switch.js';
import { Textarea } from '~/components/ui/textarea.js';
import type { ArrayField, FieldConfig } from '~/lib/page-builder-admin/fieldConfig.js';
import { getPath, setPath } from '~/lib/page-builder-admin/objectPath.js';

/**
 * Renders one field-config-driven form for a widget's `rawSettings`,
 * recursively for `array` fields (arrays of objects, optionally nesting
 * further arrays — e.g. footer_menu's columns→links, tiered_categories'
 * groups→subs). No drag-reorder here — that's `Layers.tsx`'s job for
 * widget order; array rows just get up/down buttons.
 */
export function SettingsForm({
  fields,
  values,
  onChange
}: {
  fields: FieldConfig[];
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <FieldRow key={field.key} field={field} values={values} onChange={onChange} />
      ))}
    </div>
  );
}

function FieldRow({
  field,
  values,
  onChange
}: {
  field: FieldConfig;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const value = getPath(values, field.key);
  const update = (v: unknown) => onChange(setPath(values, field.key, v));

  if (field.type === 'array') {
    return <ArrayFieldRow field={field} value={Array.isArray(value) ? value : []} onChange={update} />;
  }

  return (
    <div className="space-y-1.5">
      <Label>{field.label}</Label>
      {field.type === 'text' && <Input value={(value as string) ?? ''} onChange={(e) => update(e.target.value)} />}
      {field.type === 'color' && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={typeof value === 'string' && /^#/.test(value) ? value : '#000000'}
            onChange={(e) => update(e.target.value)}
            className="h-9 w-9 rounded border border-input"
          />
          <Input value={(value as string) ?? ''} onChange={(e) => update(e.target.value)} placeholder="#rrggbb or CSS color" />
        </div>
      )}
      {field.type === 'textarea' && <Textarea value={(value as string) ?? ''} onChange={(e) => update(e.target.value)} rows={3} />}
      {field.type === 'number' && (
        <Input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => update(e.target.value === '' ? null : Number(e.target.value))}
        />
      )}
      {field.type === 'toggle' && <Switch checked={!!value} onCheckedChange={(checked) => update(checked)} />}
      {field.type === 'select' && (
        <Select value={(value as string) ?? undefined} onValueChange={(v) => update(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {field.type === 'json' && <JsonField value={value} onChange={update} />}
      {field.type === 'image' && <ImageUploader value={(value as string) ?? ''} onChange={update} />}
    </div>
  );
}

function JsonField({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setError(null);
          } catch {
            setError('Invalid JSON');
          }
        }}
        rows={4}
        className="font-mono text-xs"
        spellCheck={false}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ArrayFieldRow({ field, value, onChange }: { field: ArrayField; value: unknown[]; onChange: (v: unknown[]) => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function itemTitle(item: unknown, index: number): string {
    const raw = field.itemLabel ? getPath(item, field.itemLabel) : undefined;
    return typeof raw === 'string' && raw ? raw : `Item ${index + 1}`;
  }

  return (
    <div className="space-y-1.5">
      <Label>{field.label}</Label>
      <div className="space-y-2 rounded-md border border-border p-2">
        {value.map((item, index) => (
          <div key={index} className="rounded border border-border">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button
                type="button"
                className="flex-1 truncate text-left text-sm"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                {itemTitle(item, index)}
              </button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === 0}
                onClick={() => {
                  const next = [...value];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  onChange(next);
                }}
                title="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === value.length - 1}
                onClick={() => {
                  const next = [...value];
                  [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  onChange(next);
                }}
                title="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
            {openIndex === index && (
              <div className="border-t border-border p-2">
                <SettingsForm
                  fields={field.itemFields}
                  values={(item ?? {}) as Record<string, unknown>}
                  onChange={(nextItem) => {
                    const next = [...value];
                    next[index] = nextItem;
                    onChange(next);
                  }}
                />
              </div>
            )}
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
            onChange([...value, { ...field.defaultItem, id }]);
            setOpenIndex(value.length);
          }}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}
