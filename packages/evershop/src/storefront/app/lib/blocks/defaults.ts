/**
 * Merges a block's own defaults under the merchant's stored settings.
 *
 * This resolves a real tension in how widgets are seeded. `buildPuckConfig.ts`
 * argues — correctly — that palette `defaultSettings` must stay empty, because
 * those values are PERSISTED the moment a widget is dropped and would ship to
 * a live store if the merchant never overwrote them. But a block that renders
 * nothing collapses to zero height and cannot be clicked to configure, which
 * is why `components/widgets/README.md` asks for presentable defaults instead.
 *
 * Both hold if the defaults live in the component rather than the palette: the
 * document stores only what the merchant actually typed, while the block still
 * renders complete the instant it lands. The `data-evershop-widget-shell`
 * `:empty` affordance stays for native widgets and simply never fires here.
 *
 * Empty string counts as unset: clearing a field in the sidebar restores the
 * default rather than blanking the block. That is right for a heading or a CTA
 * label. If a block ever needs a genuinely blank-able field, it should read
 * `widget.rawSettings` directly for that one key.
 */
export function withBlockDefaults<T extends Record<string, unknown>>(
  settings: unknown,
  defaults: T
): T {
  const raw = (settings ?? {}) as Record<string, unknown>;
  const out = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const v = raw[key as string];
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[key] = v as T[keyof T];
  }
  return out;
}
