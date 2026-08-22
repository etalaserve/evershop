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
  fontSans: 'Inter, ui-sans-serif, system-ui, sans-serif',
  /**
   * Raw CSS custom-property declarations pasted from a shadcn theme export
   * (the body of its `:root {...}`/`.dark {...}` block, not the whole
   * rule) — the page-builder's Theme sheet writes these. Applied *after*
   * the named tokens above in `themeTokensToCss()`, so a full paste always
   * wins over the individual color fields for any token it also sets.
   * Empty string = no override.
   */
  customLightCss: '',
  customDarkCss: ''
} as const;

export type ThemeTokens = typeof DEFAULT_THEME_TOKENS;

/** Merge whatever EverShop's `setting.themeTokens` returned over the defaults — null/partial-safe. */
export function resolveThemeTokens(remote: Partial<ThemeTokens> | null | undefined): ThemeTokens {
  return { ...DEFAULT_THEME_TOKENS, ...(remote ?? {}) };
}

/** The named (non-raw-CSS) keys — everything in `ThemeTokens` except `customLightCss`/`customDarkCss`. */
const NAMED_TOKEN_TO_CSS_VAR = {
  primary: '--primary',
  secondary: '--secondary',
  accent: '--accent',
  destructive: '--destructive',
  background: '--background',
  foreground: '--foreground',
  muted: '--muted',
  radius: '--radius',
  fontSans: '--font-sans'
} as const;

type NamedTokenKey = keyof typeof NAMED_TOKEN_TO_CSS_VAR;

/** Build the `:root { ... }` / `.dark { ... }` override blocks injected by <ThemeStyle>. */
export function themeTokensToCss(tokens: ThemeTokens): string {
  const lightLines = (Object.keys(NAMED_TOKEN_TO_CSS_VAR) as NamedTokenKey[]).map((key) => {
    const cssVar = NAMED_TOKEN_TO_CSS_VAR[key];
    const value = key === 'radius' ? `${tokens[key]}rem` : tokens[key];
    return `  ${cssVar}: ${value};`;
  });
  if (tokens.customLightCss) lightLines.push(tokens.customLightCss);
  const blocks = [`:root {\n${lightLines.join('\n')}\n}`];
  if (tokens.customDarkCss) blocks.push(`.dark {\n${tokens.customDarkCss}\n}`);
  return blocks.join('\n');
}

/**
 * Extracts the declaration bodies of the first `:root { ... }` and
 * `.dark { ... }` blocks in a pasted shadcn theme snippet. Scoped
 * deliberately to flat `--var: value;` declarations only (no nested
 * at-rules/media queries) — that's exactly the shape every shadcn theme
 * export actually produces, so a naive brace-matched regex is sufficient.
 */
export function parseShadcnThemeCss(raw: string): { light: string; dark: string } {
  const rootMatch = raw.match(/:root\s*\{([^}]*)\}/);
  const darkMatch = raw.match(/\.dark\s*\{([^}]*)\}/);
  return {
    light: rootMatch ? rootMatch[1].trim() : '',
    dark: darkMatch ? darkMatch[1].trim() : ''
  };
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
