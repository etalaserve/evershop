/**
 * Palette entries for the widget types ported to the new storefront
 * (`~/lib/widgets/bootstrap.ts`). No schema is exposed cross-stack (see
 * that file's own doc comment), so `defaultSettings` here is hand-mirrored
 * from each storefront widget component's `rawSettings` shape — same
 * source of truth used to build those components in the first place.
 *
 * Multiple `PaletteEntry`s can share one `type` — that's how "variants" are
 * modeled (e.g. "Banner — Centered" and "Banner — Split" are two entries,
 * both `type: 'banner'`, distinguished by `variantId` and different
 * `defaultSettings`). For widgets that already have a real settings axis
 * (`layout`, `imagePosition`, `contentPosition`, ...), the variant is just a
 * different preset of that existing axis — no `variant` key needed, the
 * component already branches on the field it's reading. For widgets with no
 * such axis, `defaultSettings.variant` is a new key the component switches
 * on internally (see each component's own `variant` handling).
 */
export interface PaletteEntry {
  type: string;
  /** Unique per palette card — NOT the same as `type` once a type has multiple variants. Used for React keys, drag payload, and the `paletteEntry()` lookup. */
  variantId: string;
  label: string;
  category: 'layout' | 'content' | 'marketing' | 'navigation' | 'commerce';
  defaultSettings: Record<string, unknown>;
}

/** Shared `defaultSettings` for the four `RecommendationShelf`-backed commerce types — differ only in heading/limit. */
function recommendationShelfSettings(heading: string, limit: number, variant: 'grid' | 'carousel') {
  return { heading, limit, variant };
}

export const WIDGET_PALETTE: PaletteEntry[] = [
  // --- layout ---
  { type: 'columns', variantId: 'columns:default', label: 'Columns', category: 'layout', defaultSettings: { columnCount: 2, gap: 16, ratio: '1-1', background: null, padding: 'none', contentPosition: 'mc' } },
  { type: 'section', variantId: 'section:boxed', label: 'Section — Boxed', category: 'layout', defaultSettings: { width: 'boxed', padding: 'md', background: null, backgroundImage: null, overlayTint: 'none', overlayOpacity: 0.3 } },
  { type: 'section', variantId: 'section:full-bleed', label: 'Section — Full-bleed', category: 'layout', defaultSettings: { width: 'wide', padding: 'lg', background: null, backgroundImage: null, overlayTint: 'none', overlayOpacity: 0.3 } },
  { type: 'separator', variantId: 'separator:line', label: 'Separator — Line', category: 'layout', defaultSettings: { size: 'md', showLine: true, lineColor: null } },
  { type: 'separator', variantId: 'separator:spacer', label: 'Separator — Spacer', category: 'layout', defaultSettings: { size: 'lg', showLine: false, lineColor: null } },

  // --- content ---
  { type: 'text_block', variantId: 'text_block:default', label: 'Text block', category: 'content', defaultSettings: { className: '', text: '[]' } },
  { type: 'faq_block', variantId: 'faq_block:compact', label: 'FAQ block — Compact', category: 'content', defaultSettings: { heading: 'Frequently asked', sections: [], maxWidth: 'normal', allowMultipleOpen: false } },
  { type: 'faq_block', variantId: 'faq_block:wide', label: 'FAQ block — Wide', category: 'content', defaultSettings: { heading: 'Frequently asked', sections: [], maxWidth: 'wide', allowMultipleOpen: true } },
  { type: 'brand_story', variantId: 'brand_story:image-left', label: 'Brand story — Image left', category: 'content', defaultSettings: { layout: 'image-left', heading: '', body: '' } },
  { type: 'brand_story', variantId: 'brand_story:pull-quote', label: 'Brand story — Pull quote', category: 'content', defaultSettings: { layout: 'pull-quote', heading: '', body: '', pullQuote: '' } },

  // --- marketing ---
  { type: 'trust_strip', variantId: 'trust_strip:centered', label: 'Trust strip — Centered', category: 'marketing', defaultSettings: { items: [], columns: null, showIcons: true, alignment: 'center', divider: false } },
  { type: 'trust_strip', variantId: 'trust_strip:divided', label: 'Trust strip — Divided list', category: 'marketing', defaultSettings: { items: [], columns: null, showIcons: false, alignment: 'left', divider: true } },
  { type: 'banner', variantId: 'banner:centered', label: 'Banner — Centered', category: 'marketing', defaultSettings: { src: '', contentPosition: 'mc', overlayTint: 'dark', overlayOpacity: 0.35 } },
  { type: 'banner', variantId: 'banner:split', label: 'Banner — Split', category: 'marketing', defaultSettings: { src: '', contentPosition: 'ml', overlayTint: 'gradient', overlayOpacity: 0.5 } },
  { type: 'simple_slider', variantId: 'simple_slider:wide', label: 'Slideshow — Wide', category: 'marketing', defaultSettings: { slides: [], arrows: true, dots: true, aspectRatio: '21:9' } },
  { type: 'simple_slider', variantId: 'simple_slider:spotlight', label: 'Slideshow — Spotlight', category: 'marketing', defaultSettings: { slides: [], arrows: true, dots: true, aspectRatio: '1:1' } },
  { type: 'announcement_bar', variantId: 'announcement_bar:static', label: 'Announcement bar — Static', category: 'marketing', defaultSettings: { backgroundColor: '#111827', textColor: '#ffffff', delay: 4000, announcements: [], variant: 'static' } },
  { type: 'announcement_bar', variantId: 'announcement_bar:rotating', label: 'Announcement bar — Rotating', category: 'marketing', defaultSettings: { backgroundColor: '#111827', textColor: '#ffffff', delay: 4000, announcements: [], variant: 'rotating' } },
  { type: 'coupon_block', variantId: 'coupon_block:card', label: 'Coupon block — Card', category: 'marketing', defaultSettings: { heading: '', code: '', ctaLabel: '', ctaLink: '', variant: 'card' } },
  { type: 'coupon_block', variantId: 'coupon_block:compact', label: 'Coupon block — Compact', category: 'marketing', defaultSettings: { heading: '', code: '', ctaLabel: '', ctaLink: '', variant: 'compact' } },
  { type: 'split_feature', variantId: 'split_feature:image-left', label: 'Split feature — Image left', category: 'marketing', defaultSettings: { image: '', heading: '', imagePosition: 'left', imageFit: 'cover' } },
  { type: 'split_feature', variantId: 'split_feature:image-right', label: 'Split feature — Image right', category: 'marketing', defaultSettings: { image: '', heading: '', imagePosition: 'right', imageFit: 'cover' } },
  { type: 'bento_grid', variantId: 'bento_grid:hero', label: 'Bento grid — Hero', category: 'marketing', defaultSettings: { tiles: [], gap: 'md', variant: 'hero' } },
  { type: 'bento_grid', variantId: 'bento_grid:equal', label: 'Bento grid — Equal', category: 'marketing', defaultSettings: { tiles: [], gap: 'md', variant: 'equal' } },

  // --- navigation ---
  { type: 'basic_menu', variantId: 'basic_menu:underline', label: 'Menu — Underline', category: 'navigation', defaultSettings: { menus: [], isMain: false, className: '', variant: 'underline' } },
  { type: 'basic_menu', variantId: 'basic_menu:pill', label: 'Menu — Pill', category: 'navigation', defaultSettings: { menus: [], isMain: false, className: '', variant: 'pill' } },
  { type: 'footer_menu', variantId: 'footer_menu:plain', label: 'Footer menu — Plain', category: 'navigation', defaultSettings: { columns: [], variant: 'plain' } },
  { type: 'footer_menu', variantId: 'footer_menu:card', label: 'Footer menu — Card', category: 'navigation', defaultSettings: { columns: [], variant: 'card' } },
  { type: 'category_mosaic', variantId: 'category_mosaic:grid', label: 'Category mosaic — Grid', category: 'navigation', defaultSettings: { tiles: [], columns: 3, layout: 'grid' } },
  { type: 'category_mosaic', variantId: 'category_mosaic:asymmetric', label: 'Category mosaic — Asymmetric', category: 'navigation', defaultSettings: { tiles: [], columns: 3, layout: 'asymmetric' } },
  { type: 'tiered_categories', variantId: 'tiered_categories:images', label: 'Tiered categories — With images', category: 'navigation', defaultSettings: { groups: [], columns: 4, variant: 'images' } },
  { type: 'tiered_categories', variantId: 'tiered_categories:compact', label: 'Tiered categories — Compact list', category: 'navigation', defaultSettings: { groups: [], columns: 4, variant: 'compact' } },

  // --- commerce ---
  { type: 'related_products', variantId: 'related_products:grid', label: 'Related products — Grid', category: 'commerce', defaultSettings: recommendationShelfSettings('You may also like', 4, 'grid') },
  { type: 'related_products', variantId: 'related_products:carousel', label: 'Related products — Carousel', category: 'commerce', defaultSettings: recommendationShelfSettings('You may also like', 8, 'carousel') },
  { type: 'frequently_bought_together', variantId: 'frequently_bought_together:grid', label: 'Frequently bought together — Grid', category: 'commerce', defaultSettings: recommendationShelfSettings('Frequently bought together', 3, 'grid') },
  { type: 'frequently_bought_together', variantId: 'frequently_bought_together:carousel', label: 'Frequently bought together — Carousel', category: 'commerce', defaultSettings: recommendationShelfSettings('Frequently bought together', 6, 'carousel') },
  { type: 'upsell_products', variantId: 'upsell_products:grid', label: 'Upsell products — Grid', category: 'commerce', defaultSettings: recommendationShelfSettings('Upgrade your pick', 4, 'grid') },
  { type: 'upsell_products', variantId: 'upsell_products:carousel', label: 'Upsell products — Carousel', category: 'commerce', defaultSettings: recommendationShelfSettings('Upgrade your pick', 8, 'carousel') },
  {
    type: 'cart_frequently_bought_together',
    variantId: 'cart_frequently_bought_together:grid',
    label: 'Cart: frequently bought together — Grid',
    category: 'commerce',
    defaultSettings: recommendationShelfSettings('Frequently bought with your items', 4, 'grid')
  },
  {
    type: 'cart_frequently_bought_together',
    variantId: 'cart_frequently_bought_together:carousel',
    label: 'Cart: frequently bought together — Carousel',
    category: 'commerce',
    defaultSettings: recommendationShelfSettings('Frequently bought with your items', 8, 'carousel')
  },
  {
    type: 'collection_products',
    variantId: 'collection_products:grid',
    label: 'Collection products — Grid',
    category: 'commerce',
    defaultSettings: { collection: null, count: 4, countPerRow: 4, heading: null, subText: null, viewAllLink: null, viewAllLabel: null, variant: 'grid' }
  },
  {
    type: 'collection_products',
    variantId: 'collection_products:carousel',
    label: 'Collection products — Carousel',
    category: 'commerce',
    defaultSettings: { collection: null, count: 8, countPerRow: 4, heading: null, subText: null, viewAllLink: null, viewAllLabel: null, variant: 'carousel' }
  },
  { type: 'collection_stack', variantId: 'collection_stack:grid', label: 'Collection stack — Grid', category: 'commerce', defaultSettings: { collections: [], productCount: 4, countPerRow: 4, divider: true, variant: 'grid' } },
  { type: 'collection_stack', variantId: 'collection_stack:carousel', label: 'Collection stack — Carousel', category: 'commerce', defaultSettings: { collections: [], productCount: 8, countPerRow: 4, divider: true, variant: 'carousel' } },
  {
    type: 'collection_spotlight',
    variantId: 'collection_spotlight:image-left',
    label: 'Collection spotlight — Image left',
    category: 'commerce',
    defaultSettings: { collection: null, image: null, imageAlt: '', imagePosition: 'left', eyebrow: 'COLLECTION', heading: '', body: null, previewCount: 4, viewAllLink: null, viewAllLabel: null }
  },
  {
    type: 'collection_spotlight',
    variantId: 'collection_spotlight:image-right',
    label: 'Collection spotlight — Image right',
    category: 'commerce',
    defaultSettings: { collection: null, image: null, imageAlt: '', imagePosition: 'right', eyebrow: 'COLLECTION', heading: '', body: null, previewCount: 4, viewAllLink: null, viewAllLabel: null }
  },
  {
    type: 'product_hero',
    variantId: 'product_hero:image-left',
    label: 'Product hero — Image left',
    category: 'commerce',
    defaultSettings: { productUuid: null, image: null, imageAlt: '', eyebrow: 'FEATURED', copy: null, imagePosition: 'left' }
  },
  {
    type: 'product_hero',
    variantId: 'product_hero:image-right',
    label: 'Product hero — Image right',
    category: 'commerce',
    defaultSettings: { productUuid: null, image: null, imageAlt: '', eyebrow: 'FEATURED', copy: null, imagePosition: 'right' }
  },
  {
    type: 'featured_blogs',
    variantId: 'featured_blogs:grid',
    label: 'Featured blogs — Grid',
    category: 'commerce',
    defaultSettings: { eyebrow: '', heading: '', subText: '', postUuids: [], count: 3, columns: 3, variant: 'grid' }
  },
  {
    type: 'featured_blogs',
    variantId: 'featured_blogs:carousel',
    label: 'Featured blogs — Carousel',
    category: 'commerce',
    defaultSettings: { eyebrow: '', heading: '', subText: '', postUuids: [], count: 6, columns: 3, variant: 'carousel' }
  },
  {
    type: 'latest_products',
    variantId: 'latest_products:grid',
    label: 'Latest products — Grid',
    category: 'commerce',
    defaultSettings: { heading: 'New arrivals', subText: null, count: 8, countPerRow: 4, viewAllLink: null, viewAllLabel: null, variant: 'grid' }
  },
  {
    type: 'latest_products',
    variantId: 'latest_products:carousel',
    label: 'Latest products — Carousel',
    category: 'commerce',
    defaultSettings: { heading: 'New arrivals', subText: null, count: 8, countPerRow: 4, viewAllLink: null, viewAllLabel: null, variant: 'carousel' }
  },
  {
    type: 'top_categories',
    variantId: 'top_categories:default',
    label: 'Top categories',
    category: 'navigation',
    defaultSettings: { heading: null }
  },

  // --- commerce page furniture (Phase 5) ---
  // One entry each: these have no settings to vary, so there is no second
  // variant to offer. They draw entirely from the product the page is about,
  // which is what makes a product page fully composable rather than a fixed
  // route template.
  { type: 'product_gallery', variantId: 'product_gallery:default', label: 'Product gallery', category: 'commerce', defaultSettings: {} },
  { type: 'product_price', variantId: 'product_price:default', label: 'Product price', category: 'commerce', defaultSettings: {} },
  { type: 'product_add_to_cart', variantId: 'product_add_to_cart:default', label: 'Add to cart', category: 'commerce', defaultSettings: {} },
  { type: 'listing_header', variantId: 'listing_header:default', label: 'Listing header', category: 'commerce', defaultSettings: {} },
  { type: 'listing_grid', variantId: 'listing_grid:default', label: 'Product listing', category: 'commerce', defaultSettings: {} },
  { type: 'cart_switch', variantId: 'cart_switch:default', label: 'Cart switch', category: 'commerce', defaultSettings: {} },
  { type: 'cart_line_items', variantId: 'cart_line_items:default', label: 'Cart items', category: 'commerce', defaultSettings: {} },
  { type: 'cart_summary', variantId: 'cart_summary:default', label: 'Cart total and checkout', category: 'commerce', defaultSettings: {} },
  { type: 'blog_post_header', variantId: 'blog_post_header:default', label: 'Post title and byline', category: 'content', defaultSettings: {} },
  { type: 'blog_post_hero', variantId: 'blog_post_hero:default', label: 'Post hero image', category: 'content', defaultSettings: {} },
  { type: 'blog_post_body', variantId: 'blog_post_body:default', label: 'Post body', category: 'content', defaultSettings: {} },
  { type: 'account_profile', variantId: 'account_profile:default', label: 'Customer profile', category: 'commerce', defaultSettings: {} },

  // Site-wide content. Placed only in the `all` document; the route picker
  // surfaces it as "Global (all pages)".
  { type: 'global_regions', variantId: 'global_regions:default', label: 'Global regions', category: 'layout', defaultSettings: {} }
];

export function paletteEntry(variantId: string): PaletteEntry | undefined {
  return WIDGET_PALETTE.find((w) => w.variantId === variantId);
}

/**
 * Categories safe for "Shuffle" to pick from at random — excludes
 * `commerce`, since those widgets need a real product/collection reference
 * to render meaningfully (a random `product_hero` with no `productUuid`
 * just renders empty), unlike layout/content/marketing/navigation widgets
 * whose `defaultSettings` are self-contained placeholder content.
 */
export const SHUFFLE_CATEGORIES: PaletteEntry['category'][] = ['layout', 'content', 'marketing', 'navigation'];

export function shuffleCandidates(): PaletteEntry[] {
  return WIDGET_PALETTE.filter((entry) => SHUFFLE_CATEGORIES.includes(entry.category));
}
