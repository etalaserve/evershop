/**
 * Palette entries for the widget types ported to the new storefront
 * (`~/lib/widgets/bootstrap.ts`). No schema is exposed cross-stack (see
 * that file's own doc comment), so `defaultSettings` here is hand-mirrored
 * from each storefront widget component's `rawSettings` shape — same
 * source of truth used to build those components in the first place.
 */
export interface PaletteEntry {
  type: string;
  label: string;
  category: 'layout' | 'content' | 'marketing' | 'navigation' | 'commerce';
  defaultSettings: Record<string, unknown>;
}

export const WIDGET_PALETTE: PaletteEntry[] = [
  { type: 'columns', label: 'Columns', category: 'layout', defaultSettings: { columnCount: 2, gap: 16, ratio: '1-1', background: null, padding: 'none', contentPosition: 'mc' } },
  { type: 'section', label: 'Section', category: 'layout', defaultSettings: { width: 'boxed', padding: 'md', background: null, backgroundImage: null, overlayTint: 'none', overlayOpacity: 0.3 } },
  { type: 'separator', label: 'Separator', category: 'layout', defaultSettings: { size: 'md', showLine: false, lineColor: null } },
  { type: 'text_block', label: 'Text block', category: 'content', defaultSettings: { className: '', text: '[]' } },
  { type: 'trust_strip', label: 'Trust strip', category: 'marketing', defaultSettings: { items: [], columns: null, showIcons: true, alignment: 'center', divider: false } },
  { type: 'faq_block', label: 'FAQ block', category: 'content', defaultSettings: { heading: 'Frequently asked', sections: [], maxWidth: 'normal', allowMultipleOpen: false } },
  { type: 'banner', label: 'Banner', category: 'marketing', defaultSettings: { src: '', alignment: 'center', contentPosition: 'mc', overlayTint: 'none', overlayOpacity: 0.3 } },
  { type: 'simple_slider', label: 'Slideshow', category: 'marketing', defaultSettings: { slides: [], arrows: true, dots: true, aspectRatio: 'auto' } },
  { type: 'basic_menu', label: 'Menu', category: 'navigation', defaultSettings: { menus: [], isMain: false, className: '' } },
  { type: 'footer_menu', label: 'Footer menu', category: 'navigation', defaultSettings: { columns: [] } },
  { type: 'announcement_bar', label: 'Announcement bar', category: 'marketing', defaultSettings: { backgroundColor: '#111827', textColor: '#ffffff', delay: 4000, announcements: [] } },
  { type: 'coupon_block', label: 'Coupon block', category: 'marketing', defaultSettings: { heading: '', code: '', ctaLabel: '', ctaLink: '' } },
  { type: 'brand_story', label: 'Brand story', category: 'content', defaultSettings: { layout: 'image-right', heading: '', body: '' } },
  { type: 'split_feature', label: 'Split feature', category: 'marketing', defaultSettings: { image: '', heading: '', imagePosition: 'left' } },
  { type: 'category_mosaic', label: 'Category mosaic', category: 'navigation', defaultSettings: { tiles: [], columns: 3, layout: 'grid' } },
  { type: 'tiered_categories', label: 'Tiered categories', category: 'navigation', defaultSettings: { groups: [], columns: 4 } },
  { type: 'bento_grid', label: 'Bento grid', category: 'marketing', defaultSettings: { tiles: [], gap: 'md' } },
  { type: 'related_products', label: 'Related products', category: 'commerce', defaultSettings: { heading: 'You may also like', limit: 4 } },
  { type: 'frequently_bought_together', label: 'Frequently bought together', category: 'commerce', defaultSettings: { heading: 'Frequently bought together', limit: 3 } },
  { type: 'upsell_products', label: 'Upsell products', category: 'commerce', defaultSettings: { heading: 'Upgrade your pick', limit: 4 } },
  { type: 'cart_frequently_bought_together', label: 'Cart: frequently bought together', category: 'commerce', defaultSettings: { heading: 'Frequently bought with your items', limit: 4 } },
  {
    type: 'collection_products',
    label: 'Collection products',
    category: 'commerce',
    defaultSettings: { collection: null, count: 4, countPerRow: 4, heading: null, subText: null, viewAllLink: null, viewAllLabel: null }
  },
  { type: 'collection_stack', label: 'Collection stack', category: 'commerce', defaultSettings: { collections: [], productCount: 4, countPerRow: 4, divider: true } },
  {
    type: 'collection_spotlight',
    label: 'Collection spotlight',
    category: 'commerce',
    defaultSettings: {
      collection: null,
      image: null,
      imageAlt: '',
      imagePosition: 'left',
      eyebrow: 'COLLECTION',
      heading: '',
      body: null,
      previewCount: 4,
      viewAllLink: null,
      viewAllLabel: null
    }
  },
  {
    type: 'product_hero',
    label: 'Product hero',
    category: 'commerce',
    defaultSettings: { productUuid: null, image: null, imageAlt: '', eyebrow: 'FEATURED', copy: null, imagePosition: 'left' }
  },
  {
    type: 'featured_blogs',
    label: 'Featured blogs',
    category: 'commerce',
    defaultSettings: { eyebrow: '', heading: '', subText: '', postUuids: [], count: 3, columns: 3 }
  }
];

export function paletteEntry(type: string): PaletteEntry | undefined {
  return WIDGET_PALETTE.find((w) => w.type === type);
}
