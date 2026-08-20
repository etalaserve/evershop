/**
 * Mirrors `DEFAULT_THEME_TOKENS` in the EverShop admin's Theme Builder
 * (`packages/evershop/src/modules/setting/pages/admin/themeBuilder/ThemeBuilder.tsx`).
 * Both sides must agree on the token shape — this is the storefront's
 * fallback for a tenant who hasn't customized anything yet.
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
} as const;

export type ThemeTokens = typeof DEFAULT_THEME_TOKENS;

/** Merge whatever EverShop's `setting.themeTokens` returned over the defaults — null/partial-safe. */
export function resolveThemeTokens(remote: Partial<ThemeTokens> | null | undefined): ThemeTokens {
  return { ...DEFAULT_THEME_TOKENS, ...(remote ?? {}) };
}

const TOKEN_TO_CSS_VAR: Record<keyof ThemeTokens, string> = {
  primary: '--primary',
  secondary: '--secondary',
  accent: '--accent',
  destructive: '--destructive',
  background: '--background',
  foreground: '--foreground',
  muted: '--muted',
  radius: '--radius',
  fontSans: '--font-sans'
};

/** Build the `:root { ... }` override block injected by <ThemeStyle>. */
export function themeTokensToCss(tokens: ThemeTokens): string {
  const lines = (Object.keys(tokens) as (keyof ThemeTokens)[]).map((key) => {
    const cssVar = TOKEN_TO_CSS_VAR[key];
    const value = key === 'radius' ? `${tokens[key]}rem` : tokens[key];
    return `  ${cssVar}: ${value};`;
  });
  return `:root {\n${lines.join('\n')}\n}`;
}

/**
 * The first three entries in the admin Theme Builder's `FONT_OPTIONS`
 * (`packages/evershop/src/modules/setting/pages/admin/themeBuilder/ThemeBuilder.tsx`)
 * are system font stacks — no network request needed. Anything else is a
 * Google Fonts family name, loaded on demand.
 */
const SYSTEM_FONT_STACKS = new Set([
  'ui-sans-serif, system-ui, sans-serif',
  'ui-serif, Georgia, serif',
  'ui-monospace, monospace'
]);

/** The Google Fonts family to request for `<link>`, or null for a system stack (no request). */
export function googleFontFamily(fontSans: string): string | null {
  if (SYSTEM_FONT_STACKS.has(fontSans)) return null;
  const first = fontSans.split(',')[0]?.trim();
  return first || null;
}
