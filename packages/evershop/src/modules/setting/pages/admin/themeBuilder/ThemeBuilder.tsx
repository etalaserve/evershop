import { SettingMenu } from '@components/admin/SettingMenu.js';
import { Form, useFormContext } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { RangeField } from '@components/common/form/RangeField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Default token set, matching the shadcn "Default" light preset already used
 * by the admin panel's own `shadcn.css` (`modules/base/pages/admin/all/shadcn.css`).
 * Hex, not oklch — `<input type="color">` only speaks hex, and a hex value is
 * just as valid wherever the storefront's CSS references `var(--primary)`.
 */
export const DEFAULT_THEME_TOKENS = {
  primary: '#171717',
  secondary: '#f5f5f5',
  accent: '#f5f5f5',
  destructive: '#dc2626',
  background: '#ffffff',
  foreground: '#171717',
  muted: '#f5f5f5',
  radius: 0.5,
  fontSans: 'Inter, ui-sans-serif, system-ui, sans-serif'
};

export type ThemeTokens = typeof DEFAULT_THEME_TOKENS;

/** A handful of ready-made token sets — shadcn.com/create's "pick a starting point" pattern, not a curated design system, just a fast way to see the theming actually work. */
export const THEME_PRESETS: Record<string, ThemeTokens> = {
  Default: DEFAULT_THEME_TOKENS,
  Rose: {
    ...DEFAULT_THEME_TOKENS,
    primary: '#e11d48',
    secondary: '#ffe4e6',
    accent: '#ffe4e6'
  },
  Ocean: {
    ...DEFAULT_THEME_TOKENS,
    primary: '#0369a1',
    secondary: '#e0f2fe',
    accent: '#e0f2fe'
  },
  Forest: {
    ...DEFAULT_THEME_TOKENS,
    primary: '#15803d',
    secondary: '#dcfce7',
    accent: '#dcfce7'
  }
};

/**
 * A small curated set — system fonts (load instantly, no network request)
 * plus a handful of Google Fonts loaded on demand by the storefront's own
 * `<link>` tag (see `packages/storefront/app/lib/theme/provider.tsx`). Not
 * an exhaustive Google Fonts picker — this is a starting-point list, same
 * spirit as the color presets above.
 */
export const FONT_OPTIONS = [
  { value: 'ui-sans-serif, system-ui, sans-serif', label: 'System sans-serif' },
  { value: 'ui-serif, Georgia, serif', label: 'System serif' },
  { value: 'ui-monospace, monospace', label: 'System monospace' },
  { value: 'Inter, ui-sans-serif, system-ui, sans-serif', label: 'Inter' },
  { value: 'Roboto, ui-sans-serif, system-ui, sans-serif', label: 'Roboto' },
  { value: 'Poppins, ui-sans-serif, system-ui, sans-serif', label: 'Poppins' },
  { value: 'Playfair Display, ui-serif, Georgia, serif', label: 'Playfair Display' },
  { value: 'Merriweather, ui-serif, Georgia, serif', label: 'Merriweather' },
  { value: 'Space Grotesk, ui-sans-serif, system-ui, sans-serif', label: 'Space Grotesk' }
];

interface ColorFieldProps {
  name: keyof ThemeTokens;
  label: string;
  defaultValue: string;
}

function ColorField({ name, label, defaultValue }: ColorFieldProps) {
  return (
    <div className="flex items-end gap-3">
      <InputField
        name={name}
        type="color"
        defaultValue={defaultValue}
        className="h-9 w-12 p-1 cursor-pointer shrink-0"
        wrapperClassName="!flex-none"
      />
      <div className="flex-1">
        <InputField name={name} label={label} defaultValue={defaultValue} />
      </div>
    </div>
  );
}

function LivePreview({ tokens }: { tokens: ThemeTokens }) {
  const style = {
    '--preview-primary': tokens.primary,
    '--preview-secondary': tokens.secondary,
    '--preview-accent': tokens.accent,
    '--preview-destructive': tokens.destructive,
    '--preview-background': tokens.background,
    '--preview-foreground': tokens.foreground,
    '--preview-muted': tokens.muted,
    '--preview-radius': `${tokens.radius}rem`,
    fontFamily: tokens.fontSans
  } as React.CSSProperties;

  return (
    <div
      style={style}
      className="rounded-lg border border-border p-6 bg-[var(--preview-background)] text-[var(--preview-foreground)] space-y-4"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-lg">{_('Acme Store')}</span>
        <span
          className="text-xs px-2 py-1 rounded-[var(--preview-radius)]"
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 'var(--preview-radius)'
          }}
        >
          {_('New')}
        </span>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-white"
          style={{
            backgroundColor: tokens.primary,
            borderRadius: 'var(--preview-radius)'
          }}
        >
          {_('Add to Cart')}
        </button>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: tokens.secondary,
            borderRadius: 'var(--preview-radius)'
          }}
        >
          {_('Save')}
        </button>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-white"
          style={{
            backgroundColor: tokens.destructive,
            borderRadius: 'var(--preview-radius)'
          }}
        >
          {_('Remove')}
        </button>
      </div>
      <div
        className="p-4"
        style={{
          backgroundColor: tokens.muted,
          borderRadius: 'var(--preview-radius)'
        }}
      >
        <p className="text-sm">
          {_(
            'This card uses the muted background token — the way filter panels and empty states render on the storefront.'
          )}
        </p>
      </div>
    </div>
  );
}

interface ThemeBuilderProps {
  saveSettingApi: string;
  setting: {
    themeTokens?: Partial<ThemeTokens> | null;
  };
}

export default function ThemeBuilder({
  saveSettingApi,
  setting: { themeTokens }
}: ThemeBuilderProps) {
  const merged: ThemeTokens = { ...DEFAULT_THEME_TOKENS, ...(themeTokens || {}) };
  const [preview, setPreview] = React.useState<ThemeTokens>(merged);

  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form<Record<string, unknown>>
            method="POST"
            id="themeBuilderForm"
            action={saveSettingApi}
            onSuccess={() => toast.success(_('Theme saved'))}
            submitBtn={false}
            formOptions={{ defaultValues: { themeTokens: merged } }}
          >
            <ThemeBuilderFields defaults={merged} onChange={setPreview} />
          </Form>
        </div>
      </div>
    </div>
  );
}

/**
 * Split out so it can call `useFormContext()` (only valid inside `<Form>`) and
 * push live values up to the preview panel on every keystroke/color pick.
 */
function ThemeBuilderFields({
  defaults,
  onChange
}: {
  defaults: ThemeTokens;
  onChange: (tokens: ThemeTokens) => void;
}) {
  const { watch, setValue } = useFormContext();
  const values = watch();

  function applyPreset(preset: ThemeTokens) {
    (Object.keys(preset) as (keyof ThemeTokens)[]).forEach((key) => {
      setValue(`themeTokens.${key}`, preset[key], { shouldDirty: true });
    });
  }

  React.useEffect(() => {
    const themeTokens = (values as { themeTokens?: Partial<ThemeTokens> })
      .themeTokens;
    onChange({ ...defaults, ...(themeTokens || {}) });
  }, [JSON.stringify(values)]);

  const field = (name: keyof ThemeTokens) => `themeTokens.${name}`;
  const current = {
    ...defaults,
    ...((values as { themeTokens?: Partial<ThemeTokens> }).themeTokens || {})
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Theme Builder')}</CardTitle>
        <CardDescription>
          {_(
            'Customize your storefront colors, corner radius, and font. Changes apply the moment you save — no code, no deploy.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <CardTitle className="text-base mb-3">{_('Live preview')}</CardTitle>
          <LivePreview tokens={current} />
        </div>
        <div className="space-y-3">
          <CardTitle className="text-base">{_('Presets')}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {Object.entries(THEME_PRESETS).map(([name, preset]) => (
              <button
                key={name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-border"
                  style={{ backgroundColor: preset.primary }}
                />
                {name}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <CardTitle className="text-base">{_('Colors')}</CardTitle>
          <div className="grid grid-cols-2 gap-5">
            <ColorField
              name={field('primary') as keyof ThemeTokens}
              label={_('Primary')}
              defaultValue={defaults.primary}
            />
            <ColorField
              name={field('secondary') as keyof ThemeTokens}
              label={_('Secondary')}
              defaultValue={defaults.secondary}
            />
            <ColorField
              name={field('accent') as keyof ThemeTokens}
              label={_('Accent')}
              defaultValue={defaults.accent}
            />
            <ColorField
              name={field('destructive') as keyof ThemeTokens}
              label={_('Destructive')}
              defaultValue={defaults.destructive}
            />
            <ColorField
              name={field('background') as keyof ThemeTokens}
              label={_('Background')}
              defaultValue={defaults.background}
            />
            <ColorField
              name={field('foreground') as keyof ThemeTokens}
              label={_('Foreground')}
              defaultValue={defaults.foreground}
            />
            <ColorField
              name={field('muted') as keyof ThemeTokens}
              label={_('Muted')}
              defaultValue={defaults.muted}
            />
          </div>
        </div>
        <div className="space-y-3">
          <CardTitle className="text-base">{_('Shape & type')}</CardTitle>
          <RangeField
            name={field('radius') as keyof ThemeTokens}
            label={_('Corner radius')}
            defaultValue={defaults.radius}
            min={0}
            max={1.5}
            step={0.05}
          />
          <SelectField
            name={field('fontSans') as keyof ThemeTokens}
            label={_('Font family')}
            defaultValue={defaults.fontSans}
            options={FONT_OPTIONS}
            helperText={_(
              'Google Fonts entries are loaded by the storefront on demand — no setup needed.'
            )}
          />
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex justify-end w-full">
          <Button type="submit" form="themeBuilderForm">
            {_('Save Theme')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    saveSettingApi: url(routeId: "saveSetting")
    setting {
      themeTokens
    }
  }
`;
