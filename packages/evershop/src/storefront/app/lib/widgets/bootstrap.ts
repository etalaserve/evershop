import { GlobalRegions } from '~/components/widgets/GlobalRegions.js';
import { AccountProfile } from '~/components/widgets/commerce/AccountProfile.js';
import { BlogPostBody } from '~/components/widgets/commerce/BlogPostBody.js';
import { BlogPostHeader } from '~/components/widgets/commerce/BlogPostHeader.js';
import { BlogPostHero } from '~/components/widgets/commerce/BlogPostHero.js';
import { CartLineItems } from '~/components/widgets/commerce/CartLineItems.js';
import { CartSummary } from '~/components/widgets/commerce/CartSummary.js';
import { CartSwitch } from '~/components/widgets/commerce/CartSwitch.js';
import { ListingGrid } from '~/components/widgets/commerce/ListingGrid.js';
import { ListingHeader } from '~/components/widgets/commerce/ListingHeader.js';
import { ProductAddToCart } from '~/components/widgets/commerce/ProductAddToCart.js';
import { ProductGallery } from '~/components/widgets/commerce/ProductGallery.js';
import { ProductPrice } from '~/components/widgets/commerce/ProductPrice.js';
import { UlAboutBusiness } from '~/components/widgets/blocks/UlAboutBusiness.js';
import { registerStorefrontWidget } from './registry.js';
import { AnnouncementBar } from '~/components/widgets/AnnouncementBar.js';
import { Banner } from '~/components/widgets/Banner.js';
import { BasicMenu } from '~/components/widgets/BasicMenu.js';
import { BentoGrid } from '~/components/widgets/BentoGrid.js';
import { BrandStory } from '~/components/widgets/BrandStory.js';
import { CategoryMosaic } from '~/components/widgets/CategoryMosaic.js';
import { CollectionProducts } from '~/components/widgets/CollectionProducts.js';
import { CollectionSpotlight } from '~/components/widgets/CollectionSpotlight.js';
import { CollectionStack } from '~/components/widgets/CollectionStack.js';
import { Columns } from '~/components/widgets/Columns.js';
import { CouponBlock } from '~/components/widgets/CouponBlock.js';
import { FaqBlock } from '~/components/widgets/FaqBlock.js';
import { FeaturedBlogs } from '~/components/widgets/FeaturedBlogs.js';
import { FooterMenu } from '~/components/widgets/FooterMenu.js';
import { ProductHero } from '~/components/widgets/ProductHero.js';
import { RecommendationShelf } from '~/components/widgets/RecommendationShelf.js';
import { Section } from '~/components/widgets/Section.js';
import { Separator } from '~/components/widgets/Separator.js';
import { SimpleSlider } from '~/components/widgets/SimpleSlider.js';
import { SplitFeature } from '~/components/widgets/SplitFeature.js';
import { TextBlock } from '~/components/widgets/TextBlock.js';
import { TieredCategories } from '~/components/widgets/TieredCategories.js';
import { TopCategories } from '~/components/widgets/TopCategories.js';
import { TrustStrip } from '~/components/widgets/TrustStrip.js';


/**
 * Side-effect registration, mirroring the legacy modules' `bootstrap.ts`
 * `registerWidget()` calls. Imported once from `root.tsx` so every route
 * gets the same registry regardless of which page renders first.
 *
 * All 23 legacy `cms`/`catalog`/`blog` widget types are now registered.
 * The 9 recommendation widgets (`related_products` through
 * `featured_blogs`) are the exception to every other type here: their
 * content isn't fully described by `rawSettings` alone — they resolve
 * live product/collection/post data server-side. That resolution happens
 * in each page's loader (`resolveWidgetExtras`/`mergeProductAnchorExtras`
 * in `lib/widgets/resolveWidgetExtras.ts`), keyed by widget uuid and
 * threaded down through `WidgetArea` as the `extra` prop — see
 * `WidgetComponentProps` in `registry.tsx`.
 */
registerStorefrontWidget('columns', Columns);
registerStorefrontWidget('section', Section);
registerStorefrontWidget('separator', Separator);
registerStorefrontWidget('text_block', TextBlock);
registerStorefrontWidget('trust_strip', TrustStrip);
registerStorefrontWidget('faq_block', FaqBlock);
registerStorefrontWidget('banner', Banner);
registerStorefrontWidget('simple_slider', SimpleSlider);
registerStorefrontWidget('basic_menu', BasicMenu);
registerStorefrontWidget('footer_menu', FooterMenu);
registerStorefrontWidget('announcement_bar', AnnouncementBar);
registerStorefrontWidget('coupon_block', CouponBlock);
registerStorefrontWidget('brand_story', BrandStory);
registerStorefrontWidget('split_feature', SplitFeature);
registerStorefrontWidget('category_mosaic', CategoryMosaic);
registerStorefrontWidget('tiered_categories', TieredCategories);
registerStorefrontWidget('bento_grid', BentoGrid);
registerStorefrontWidget('related_products', RecommendationShelf);
registerStorefrontWidget('frequently_bought_together', RecommendationShelf);
registerStorefrontWidget('upsell_products', RecommendationShelf);
registerStorefrontWidget('cart_frequently_bought_together', RecommendationShelf);
registerStorefrontWidget('collection_products', CollectionProducts);
registerStorefrontWidget('collection_stack', CollectionStack);
registerStorefrontWidget('collection_spotlight', CollectionSpotlight);
registerStorefrontWidget('product_hero', ProductHero);
registerStorefrontWidget('featured_blogs', FeaturedBlogs);
// `latest_products` reuses `CollectionProducts`'s render — same extra shape
// (`heading`/`subText`/`description`/`viewAllLink`/`viewAllLabel`/`products`),
// just resolved without a collection reference (see resolveWidgetExtras.ts).
registerStorefrontWidget('latest_products', CollectionProducts);
registerStorefrontWidget('top_categories', TopCategories);

/**
 * Commerce page furniture (Phase 5).
 *
 * These have no settings and render entirely from the entity the page is
 * about, delivered as `page.product` in Puck's metadata. Registering them here
 * is what makes a product page fully composable — the merchant can place the
 * gallery, price and buy button rather than accepting the route template's
 * fixed arrangement.
 *
 * They render a placeholder outside a product page (and in the editor), so
 * dropping one on the homepage produces a labelled inert block rather than a
 * crash or a blank.
 */
registerStorefrontWidget('product_gallery', ProductGallery);
registerStorefrontWidget('product_price', ProductPrice);
registerStorefrontWidget('product_add_to_cart', ProductAddToCart);

// Listing furniture — shared by categoryView and catalogSearch, which render
// the identical shape and differ only in what the heading says.
registerStorefrontWidget('listing_header', ListingHeader);
registerStorefrontWidget('listing_grid', ListingGrid);

// Cart furniture. `cart_switch` is a container: the route branched on whether
// the cart had items, and a document cannot branch, so the branch becomes two
// named slots the merchant composes.
registerStorefrontWidget('cart_switch', CartSwitch);
registerStorefrontWidget('cart_line_items', CartLineItems);
registerStorefrontWidget('cart_summary', CartSummary);

// Blog post furniture.
registerStorefrontWidget('blog_post_header', BlogPostHeader);
registerStorefrontWidget('blog_post_hero', BlogPostHero);
registerStorefrontWidget('blog_post_body', BlogPostBody);

// Account furniture.
registerStorefrontWidget('account_profile', AccountProfile);

/**
 * Site-wide content. Only ever placed in the synthetic `all` document; the
 * render path splits its slots out and splices them around each route's own
 * content rather than rendering the container itself.
 */
registerStorefrontWidget('global_regions', GlobalRegions);

/**
 * Ported blocks from the block library. Namespaced `block_<registry>_<item>`
 * so they stay distinguishable from the widgets authored here — and because
 * this string is persisted in every document that uses one, it can never be
 * renamed.
 */
registerStorefrontWidget('block_ul_about_business', UlAboutBusiness);
