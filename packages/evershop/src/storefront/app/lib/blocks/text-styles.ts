/**
 * Text roles for ported blocks — one canonical Tailwind class string per role.
 *
 * Ported from the block library's `@/lib/text-styles`, which pairs each role
 * with a `cn-*` class whose definition lives in a per-Style sheet
 * (`packages/ui/src/styles/shadcn-styles/style-*.css`). EverShop has no Style
 * axis, so each `cn-*` half is FLATTENED here into the utilities it expands to
 * under `style-nova` — the block library's own default, and itself a copy of
 * shadcn/ui's canonical typography scale, which is the same scale EverShop's
 * "new-york" setup uses.
 *
 * Two consequences worth knowing:
 *
 * - Sizing is now literal. Changing a heading scale means editing this file,
 *   not switching a Style. That is the intended trade: one design system.
 * - Color stays OUT of the size/weight half, exactly as upstream had it —
 *   `text-muted-foreground` and friends are appended per role, so a merchant's
 *   theme tokens drive color while this file drives type.
 *
 * `font-heading` requires `--font-heading` in `app.css`'s `@theme inline`
 * (mapped to `var(--font-sans)` by default). It is kept as a seam so a heading
 * font can be split from the body font later without touching every block.
 */
export const TEXT_STYLES = {
  // --- Headings (h1-h6): document/section titles, in descending order ---
  h1: 'scroll-m-20 text-balance font-heading text-4xl font-extrabold tracking-tight',
  h2: 'scroll-m-20 border-b pb-2 first:mt-0 font-heading text-3xl font-semibold tracking-tight',
  h3: 'scroll-m-20 font-heading text-2xl font-semibold tracking-tight',
  h4: 'scroll-m-20 font-heading text-xl font-semibold tracking-tight',
  h5: 'scroll-m-20 font-heading text-lg font-semibold tracking-tight',
  h6: 'scroll-m-20 font-heading text-base font-semibold tracking-tight',

  // --- Below h6: no real HTML heading tag exists this small; these are
  // visual-only tiers for content that reads as sub-heading-level ---
  eyebrow: 'uppercase text-muted-foreground text-xs font-semibold tracking-wide',
  micro: 'uppercase text-muted-foreground text-[0.6875rem] font-medium tracking-wide',

  // --- Common shadcn text usage (body copy) ---
  p: '[&:not(:first-child)]:mt-6 leading-7',
  lead: 'text-muted-foreground text-xl',
  large: 'text-lg font-semibold',
  small: 'text-sm leading-none font-medium',
  muted: 'text-muted-foreground text-sm',
  blockquote: 'mt-6 border-l-2 pl-6 italic',
  inlineCode:
    'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
  list: 'my-6 ml-6 list-disc [&>li]:mt-2',

  // --- Captions, subtitles, labels, CTA text, popover/small hidden text ---
  caption: 'text-muted-foreground text-xs',
  subtitle: 'text-muted-foreground text-lg',
  label: 'text-sm leading-none font-medium',
  cta: 'text-sm font-semibold',
  popoverText: 'text-popover-foreground text-xs',

  // --- Hero text: larger than h1, for standalone marketing hero sections ---
  heroTitle:
    'scroll-m-20 text-balance font-heading text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl',
  heroSubtitle: 'text-muted-foreground text-lg sm:text-xl',

  // --- Stat numbers: large numeric displays (animated counters, metric
  // callouts) — a different scale from any heading, since these are
  // digits/short values, not running text. ---
  statSm: 'font-heading text-2xl font-bold tracking-tight sm:text-3xl',
  stat: 'font-heading text-4xl font-bold tracking-tight sm:text-5xl',
  statLg:
    'font-heading text-6xl font-bold tracking-tight sm:text-7xl md:text-8xl lg:text-9xl'
} as const;
