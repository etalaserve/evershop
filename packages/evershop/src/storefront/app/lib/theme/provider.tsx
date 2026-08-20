import { googleFontFamily, themeTokensToCss, type ThemeTokens } from './tokens.js';

/**
 * Injects the tenant's design-token overrides as a `<style>` block — every
 * shadcn/ui component reads these via `var(--primary)` etc, so this is the
 * entire theming mechanism. Also loads the selected Google Font on demand
 * (system font stacks skip this — no request).
 */
export function ThemeStyle({ tokens }: { tokens: ThemeTokens }) {
  const family = googleFontFamily(tokens.fontSans);
  return (
    <>
      {family && (
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`}
        />
      )}
      <style dangerouslySetInnerHTML={{ __html: themeTokensToCss(tokens) }} />
    </>
  );
}
