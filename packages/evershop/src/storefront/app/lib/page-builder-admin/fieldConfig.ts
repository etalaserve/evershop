/**
 * Field configs for the Phase B settings forms — one array per widget type,
 * hand-mirrored from each storefront widget component's `rawSettings`
 * shape (`~/components/widgets/*.tsx`), the same source of truth used to
 * build `widgetPalette.ts`'s defaults. No schema is exposed cross-stack
 * (see `lib/widgets/bootstrap.ts`), so this is authored, not generated.
 *
 * `key` supports dot-paths (e.g. `link.url`) for nested objects — see
 * `getPath`/`setPath` in `SettingsForm.tsx`. Types not listed here
 * (currently just `text_block`, whose content is an EditorJS block tree)
 * fall back to the raw JSON editor.
 */

export type FieldType = 'text' | 'textarea' | 'number' | 'toggle' | 'select' | 'color' | 'json' | 'array' | 'image';

interface FieldBase {
  key: string;
  label: string;
}
export interface TextField extends FieldBase {
  type: 'text' | 'textarea' | 'color';
}
export interface ImageField extends FieldBase {
  type: 'image';
}
export interface NumberField extends FieldBase {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}
export interface ToggleField extends FieldBase {
  type: 'toggle';
}
export interface SelectField extends FieldBase {
  type: 'select';
  options: Array<{ value: string; label: string }>;
}
export interface JsonField extends FieldBase {
  type: 'json';
}
export interface ArrayField extends FieldBase {
  type: 'array';
  itemFields: FieldConfig[];
  defaultItem: Record<string, unknown>;
  itemLabel?: string;
}
export type FieldConfig = TextField | NumberField | ToggleField | SelectField | JsonField | ArrayField | ImageField;

const PADDING_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra large' }
];
const ANCHOR_OPTIONS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'].map((v) => ({ value: v, label: v.toUpperCase() }));
const TINT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'gradient', label: 'Gradient' }
];

export const WIDGET_FIELD_CONFIGS: Record<string, FieldConfig[]> = {
  separator: [
    { key: 'size', label: 'Size', type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'].map((v) => ({ value: v, label: v.toUpperCase() })) },
    { key: 'showLine', label: 'Show line', type: 'toggle' },
    { key: 'lineColor', label: 'Line color', type: 'color' }
  ],

  columns: [
    { key: 'columnCount', label: 'Column count', type: 'number', min: 1, max: 4 },
    { key: 'gap', label: 'Gap (px)', type: 'number', min: 0, max: 80 },
    { key: 'ratio', label: 'Ratio (e.g. 1-2-1)', type: 'text' },
    { key: 'background', label: 'Background', type: 'color' },
    { key: 'padding', label: 'Padding', type: 'select', options: PADDING_OPTIONS },
    { key: 'contentPosition', label: 'Content position', type: 'select', options: ANCHOR_OPTIONS }
  ],

  section: [
    { key: 'width', label: 'Width', type: 'select', options: [{ value: 'wide', label: 'Wide' }, { value: 'boxed', label: 'Boxed' }] },
    { key: 'padding', label: 'Padding', type: 'select', options: PADDING_OPTIONS },
    { key: 'background', label: 'Background', type: 'color' },
    { key: 'backgroundImage', label: 'Background image', type: 'image' },
    { key: 'overlayTint', label: 'Overlay tint', type: 'select', options: TINT_OPTIONS },
    { key: 'overlayOpacity', label: 'Overlay opacity', type: 'number', min: 0, max: 1, step: 0.05 }
  ],

  trust_strip: [
    { key: 'columns', label: 'Columns', type: 'number', min: 1, max: 6 },
    { key: 'showIcons', label: 'Show icons', type: 'toggle' },
    { key: 'alignment', label: 'Alignment', type: 'select', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }] },
    { key: 'divider', label: 'Divider', type: 'toggle' },
    {
      key: 'items',
      label: 'Items',
      type: 'array',
      itemLabel: 'title',
      defaultItem: { id: '', icon: '', title: 'New item', description: '', link: { url: '', newTab: false } },
      itemFields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'icon', label: 'Icon', type: 'image' },
        { key: 'link.url', label: 'Link URL', type: 'text' },
        { key: 'link.newTab', label: 'Open in new tab', type: 'toggle' }
      ]
    }
  ],

  faq_block: [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'maxWidth', label: 'Max width', type: 'select', options: [{ value: 'narrow', label: 'Narrow' }, { value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Wide' }] },
    { key: 'allowMultipleOpen', label: 'Allow multiple open', type: 'toggle' },
    { key: 'sections', label: 'Sections (JSON)', type: 'json' }
  ],

  banner: [
    { key: 'src', label: 'Image', type: 'image' },
    { key: 'alt', label: 'Alt text', type: 'text' },
    { key: 'width', label: 'Width', type: 'number', min: 1 },
    { key: 'height', label: 'Height', type: 'number', min: 1 },
    { key: 'link', label: 'Whole-banner link URL', type: 'text' },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'subText', label: 'Subtext', type: 'text' },
    { key: 'contentPosition', label: 'Content position', type: 'select', options: ANCHOR_OPTIONS },
    { key: 'overlayTint', label: 'Overlay tint', type: 'select', options: TINT_OPTIONS },
    { key: 'overlayOpacity', label: 'Overlay opacity', type: 'number', min: 0, max: 1, step: 0.05 },
    { key: 'cta', label: 'Primary CTA (JSON)', type: 'json' },
    { key: 'cta2', label: 'Secondary CTA (JSON)', type: 'json' }
  ],

  simple_slider: [
    { key: 'arrows', label: 'Show arrows', type: 'toggle' },
    { key: 'dots', label: 'Show dots', type: 'toggle' },
    { key: 'aspectRatio', label: 'Aspect ratio', type: 'select', options: ['auto', '16:9', '21:9', '4:3', '1:1'].map((v) => ({ value: v, label: v })) },
    {
      key: 'slides',
      label: 'Slides',
      type: 'array',
      itemLabel: 'headline',
      defaultItem: { id: '', image: '', headline: 'New slide', buttonText: '', buttonLink: '' },
      itemFields: [
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'headline', label: 'Headline', type: 'text' },
        { key: 'subText', label: 'Subtext', type: 'text' },
        { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
        { key: 'buttonText', label: 'Button text', type: 'text' },
        { key: 'buttonLink', label: 'Button link', type: 'text' },
        { key: 'buttonStyle', label: 'Button style', type: 'select', options: ['filled', 'outline', 'link'].map((v) => ({ value: v, label: v })) },
        { key: 'overlayTint', label: 'Overlay tint', type: 'select', options: TINT_OPTIONS },
        { key: 'overlayOpacity', label: 'Overlay opacity', type: 'number', min: 0, max: 1, step: 0.05 },
        { key: 'wholeSlideLink', label: 'Whole slide is link', type: 'toggle' },
        { key: 'hidden', label: 'Hidden', type: 'toggle' }
      ]
    }
  ],

  basic_menu: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'underline', label: 'Underline' }, { value: 'pill', label: 'Pill' }] },
    { key: 'isMain', label: 'Main menu', type: 'toggle' },
    { key: 'className', label: 'Extra CSS class', type: 'text' },
    {
      key: 'menus',
      label: 'Menu items (top level — nested submenus need the JSON view)',
      type: 'array',
      itemLabel: 'name',
      defaultItem: { id: '', name: 'New item', url: '' },
      itemFields: [
        { key: 'name', label: 'Label', type: 'text' },
        { key: 'url', label: 'URL', type: 'text' },
        { key: 'newTab', label: 'Open in new tab', type: 'toggle' }
      ]
    }
  ],

  footer_menu: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'plain', label: 'Plain' }, { value: 'card', label: 'Card' }] },
    {
      key: 'columns',
      label: 'Columns',
      type: 'array',
      itemLabel: 'title',
      defaultItem: { id: '', title: 'New column', links: [] },
      itemFields: [
        { key: 'title', label: 'Column title', type: 'text' },
        {
          key: 'links',
          label: 'Links',
          type: 'array',
          itemLabel: 'label',
          defaultItem: { id: '', label: 'New link', url: '' },
          itemFields: [
            { key: 'label', label: 'Label', type: 'text' },
            { key: 'url', label: 'URL', type: 'text' }
          ]
        }
      ]
    }
  ],

  announcement_bar: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'static', label: 'Static' }, { value: 'rotating', label: 'Rotating' }] },
    { key: 'backgroundColor', label: 'Background color', type: 'color' },
    { key: 'textColor', label: 'Text color', type: 'color' },
    { key: 'delay', label: 'Delay (ms)', type: 'number', min: 0 },
    {
      key: 'announcements',
      label: 'Announcements',
      type: 'array',
      itemLabel: 'content',
      defaultItem: { id: '', content: 'New announcement', link: '' },
      itemFields: [
        { key: 'content', label: 'Message', type: 'text' },
        { key: 'link', label: 'Link URL', type: 'text' }
      ]
    }
  ],

  coupon_block: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'card', label: 'Card' }, { value: 'compact', label: 'Compact' }] },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'code', label: 'Coupon code', type: 'text' },
    { key: 'ctaLabel', label: 'CTA label', type: 'text' },
    { key: 'ctaLink', label: 'CTA link', type: 'text' },
    { key: 'ctaNewTab', label: 'Open CTA in new tab', type: 'toggle' },
    { key: 'expires', label: 'Expires (ISO datetime)', type: 'text' },
    { key: 'backgroundColor', label: 'Background color', type: 'color' }
  ],

  brand_story: [
    {
      key: 'layout',
      label: 'Layout',
      type: 'select',
      options: [
        { value: 'image-left', label: 'Image left' },
        { value: 'image-right', label: 'Image right' },
        { value: 'centered', label: 'Centered' },
        { value: 'pull-quote', label: 'Pull quote' }
      ]
    },
    { key: 'image', label: 'Image', type: 'image' },
    { key: 'imageAlt', label: 'Image alt text', type: 'text' },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'bodySecondary', label: 'Secondary body', type: 'textarea' },
    { key: 'pullQuote', label: 'Pull quote', type: 'textarea' },
    { key: 'link', label: 'Link (JSON)', type: 'json' }
  ],

  split_feature: [
    { key: 'image', label: 'Image', type: 'image' },
    { key: 'imageAlt', label: 'Image alt text', type: 'text' },
    { key: 'imagePosition', label: 'Image position', type: 'select', options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
    { key: 'width', label: 'Width', type: 'number', min: 1 },
    { key: 'height', label: 'Height', type: 'number', min: 1 },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'cta', label: 'CTA (JSON)', type: 'json' },
    { key: 'verticalAlign', label: 'Vertical align', type: 'select', options: ['top', 'center', 'bottom'].map((v) => ({ value: v, label: v })) },
    { key: 'imageFit', label: 'Image fit', type: 'select', options: [{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }] }
  ],

  category_mosaic: [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'columns', label: 'Columns', type: 'number', min: 1, max: 4 },
    { key: 'aspect', label: 'Aspect', type: 'select', options: ['1:1', '4:3', '3:4'].map((v) => ({ value: v, label: v })) },
    { key: 'layout', label: 'Layout', type: 'select', options: [{ value: 'grid', label: 'Grid' }, { value: 'asymmetric', label: 'Asymmetric' }] },
    {
      key: 'tiles',
      label: 'Tiles',
      type: 'array',
      itemLabel: 'label',
      defaultItem: { id: '', image: '', label: 'New tile', link: '' },
      itemFields: [
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'imageAlt', label: 'Image alt text', type: 'text' },
        { key: 'label', label: 'Label', type: 'text' },
        { key: 'link', label: 'Link URL', type: 'text' },
        { key: 'newTab', label: 'Open in new tab', type: 'toggle' }
      ]
    }
  ],

  tiered_categories: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'images', label: 'With images' }, { value: 'compact', label: 'Compact list' }] },
    { key: 'columns', label: 'Columns', type: 'number', min: 1, max: 6 },
    { key: 'imageAspect', label: 'Image aspect', type: 'select', options: ['1:1', '4:3', '3:4'].map((v) => ({ value: v, label: v })) },
    { key: 'showParentLink', label: 'Show parent link', type: 'toggle' },
    {
      key: 'groups',
      label: 'Groups',
      type: 'array',
      itemLabel: 'parent.label',
      defaultItem: { id: '', image: '', parent: { label: 'New group', url: '' }, subs: [] },
      itemFields: [
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'parent.label', label: 'Parent label', type: 'text' },
        { key: 'parent.url', label: 'Parent URL', type: 'text' },
        {
          key: 'subs',
          label: 'Sub-links',
          type: 'array',
          itemLabel: 'label',
          defaultItem: { id: '', label: 'New link', url: '' },
          itemFields: [
            { key: 'label', label: 'Label', type: 'text' },
            { key: 'url', label: 'URL', type: 'text' }
          ]
        }
      ]
    }
  ],

  bento_grid: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'hero', label: 'Hero' }, { value: 'equal', label: 'Equal grid' }] },
    { key: 'gap', label: 'Gap', type: 'select', options: ['sm', 'md', 'lg'].map((v) => ({ value: v, label: v.toUpperCase() })) },
    { key: 'minHeight', label: 'Min tile height (px)', type: 'number', min: 1 },
    {
      key: 'tiles',
      label: 'Tiles (first = hero)',
      type: 'array',
      itemLabel: 'heading',
      defaultItem: { id: '', heading: 'New tile', backgroundColor: '#eeeeee' },
      itemFields: [
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'imageAlt', label: 'Image alt text', type: 'text' },
        { key: 'backgroundColor', label: 'Background color', type: 'color' },
        { key: 'textColor', label: 'Text color', type: 'color' },
        { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'body', label: 'Body', type: 'text' },
        { key: 'link', label: 'Link URL', type: 'text' }
      ]
    }
  ],

  // --- Commerce widgets: live product/collection/post data, resolved
  // server-side by `resolveWidgetExtras`/`mergeProductAnchorExtras` — the
  // fields below are just the merchant-configured picks (a collection
  // code, a product uuid, a limit), not the resolved data itself. No
  // collection/product picker UI exists yet, so `collection`/`productUuid`
  // are plain text inputs (matches the same simplification every image
  // field already uses).
  related_products: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' }] },
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'limit', label: 'Max products', type: 'number', min: 1, max: 12 }
  ],
  frequently_bought_together: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' }] },
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'limit', label: 'Max products', type: 'number', min: 1, max: 12 }
  ],
  upsell_products: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' }] },
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'limit', label: 'Max products', type: 'number', min: 1, max: 12 }
  ],
  cart_frequently_bought_together: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' }] },
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'limit', label: 'Max products', type: 'number', min: 1, max: 12 }
  ],

  collection_products: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' }] },
    { key: 'collection', label: 'Collection code', type: 'text' },
    { key: 'count', label: 'Product count', type: 'number', min: 1, max: 48 },
    { key: 'countPerRow', label: 'Columns', type: 'number', min: 1, max: 6 },
    { key: 'heading', label: 'Heading override', type: 'text' },
    { key: 'subText', label: 'Subtext override', type: 'text' },
    { key: 'viewAllLink', label: '"View all" link', type: 'text' },
    { key: 'viewAllLabel', label: '"View all" label', type: 'text' }
  ],

  collection_stack: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' }] },
    { key: 'productCount', label: 'Products per row', type: 'number', min: 1, max: 12 },
    { key: 'countPerRow', label: 'Columns', type: 'number', min: 2, max: 6 },
    { key: 'divider', label: 'Show divider between rows', type: 'toggle' },
    {
      key: 'collections',
      label: 'Rows (max 3)',
      type: 'array',
      itemLabel: 'title',
      defaultItem: { id: '', source: '', title: 'New row', subText: '', viewAllLink: '', viewAllLabel: '' },
      itemFields: [
        { key: 'title', label: 'Row title', type: 'text' },
        { key: 'source', label: 'Collection code', type: 'text' },
        { key: 'subText', label: 'Subtext', type: 'text' },
        { key: 'viewAllLink', label: '"View all" link', type: 'text' },
        { key: 'viewAllLabel', label: '"View all" label', type: 'text' }
      ]
    }
  ],

  collection_spotlight: [
    { key: 'collection', label: 'Collection code', type: 'text' },
    { key: 'image', label: 'Image', type: 'image' },
    { key: 'imageAlt', label: 'Image alt text', type: 'text' },
    { key: 'imagePosition', label: 'Image position', type: 'select', options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'previewCount', label: 'Preview product count', type: 'select', options: [{ value: '2', label: '2' }, { value: '4', label: '4' }] },
    { key: 'viewAllLink', label: '"View all" link', type: 'text' },
    { key: 'viewAllLabel', label: '"View all" label', type: 'text' }
  ],

  product_hero: [
    { key: 'productUuid', label: 'Product UUID', type: 'text' },
    { key: 'image', label: 'Image override', type: 'image' },
    { key: 'imageAlt', label: 'Image alt text', type: 'text' },
    { key: 'imagePosition', label: 'Image position', type: 'select', options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'copy', label: 'Copy', type: 'textarea' }
  ],

  featured_blogs: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' }] },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'subText', label: 'Subtext', type: 'text' },
    { key: 'count', label: 'Max posts', type: 'number', min: 1, max: 24 },
    { key: 'columns', label: 'Columns', type: 'number', min: 1, max: 4 },
    { key: 'postUuids', label: 'Picked post UUIDs (JSON array)', type: 'json' }
  ],

  latest_products: [
    { key: 'variant', label: 'Style', type: 'select', options: [{ value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' }] },
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'count', label: 'Product count', type: 'number', min: 1, max: 48 },
    { key: 'countPerRow', label: 'Columns', type: 'number', min: 1, max: 6 },
    { key: 'subText', label: 'Subtext', type: 'text' },
    { key: 'viewAllLink', label: '"View all" link', type: 'text' },
    { key: 'viewAllLabel', label: '"View all" label', type: 'text' }
  ],

  top_categories: [{ key: 'heading', label: 'Heading', type: 'text' }],

  // --- ported blocks ---
  block_ul_about_business: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'heading', label: 'Heading', type: 'textarea' },
    {
      key: 'stats', label: 'Stat tiles', type: 'array', itemLabel: 'label',
      defaultItem: { value: '10+', label: 'Something counted' },
      itemFields: [
        { key: 'value', label: 'Value', type: 'text' },
        { key: 'label', label: 'Label', type: 'text' }
      ]
    },
    { key: 'imageSrc', label: 'Image', type: 'image' },
    { key: 'imageAlt', label: 'Image alt text', type: 'text' },
    {
      key: 'points', label: 'Points', type: 'array', itemLabel: 'title',
      defaultItem: { title: 'A point', body: 'What it means for the customer.' },
      itemFields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'body', label: 'Body', type: 'textarea' }
      ]
    },
    { key: 'ctaLabel', label: 'CTA label', type: 'text' },
    { key: 'ctaHref', label: 'CTA link', type: 'text' }
  ]
};
