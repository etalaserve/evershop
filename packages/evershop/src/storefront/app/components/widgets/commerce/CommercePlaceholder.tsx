/**
 * What a commerce component draws when there is no entity to draw from.
 *
 * Commerce components are page furniture: they have no settings and render
 * entirely from the product the page is about. In the editor there is no real
 * product, so they would otherwise render nothing and collapse — leaving the
 * merchant unable to see or select the block they just placed.
 *
 * Deliberately NOT a sample product. Fabricated prices and stock states in a
 * WYSIWYG canvas get mistaken for real data, and "the price is wrong on the
 * page builder" is a worse support burden than an obviously-inert outline.
 * The canvas is honest about being an approximation here.
 *
 * Renders on the storefront too if a product ever fails to resolve, which is
 * the same fail-soft posture as `resolvePuckExtras` and `WidgetBoundary`: show
 * a gap, not a broken page.
 */
export function CommercePlaceholder({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[72px] items-center justify-center rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
      data-evershop-commerce-placeholder={label}
    >
      {label} — shown on the live product page
    </div>
  );
}
