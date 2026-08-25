import { useState } from 'react';
import { data, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { JsonLd } from '~/components/content/json-ld.js';
import { RichContent } from '~/components/content/rich-content.js';
import { Badge } from '~/components/ui/badge.js';
import { Button } from '~/components/ui/button.js';
import { Separator } from '~/components/ui/separator.js';
import { WidgetArea } from '~/components/widgets/WidgetArea.js';
import { PuckArea } from '~/components/widgets/PuckArea.js';
import { loadPuckForRequest } from '~/lib/puck/engineSwitch.js';
import { CACHE_TTL, cached } from '~/lib/cache/middleware.js';
import { addToCart } from '~/lib/cart/client.js';
import { gql } from '~/lib/graphql/client.js';
import { PRODUCT_DETAIL_QUERY, type ProductDetailResponse } from '~/lib/graphql/queries/catalog.js';
import { WIDGETS_FOR_ROUTE_QUERY, type WidgetsForRouteResponse } from '~/lib/graphql/queries/widgets.js';
import { imageUrl } from '~/lib/image.js';
import { buildMeta, canonicalUrl } from '~/lib/seo.js';
import { mergeProductAnchorExtras, resolveWidgetExtras } from '~/lib/widgets/resolveWidgetExtras.js';

const ROUTE_ID = 'productView';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const urlKey = params.urlKey!;
  const changeset = new URL(request.url).searchParams.get('changeset');
  const cookie = request.headers.get('Cookie');

  const [result, widgetData] = await Promise.all([
    cached(`data:product:${urlKey}`, CACHE_TTL.data, () => gql<ProductDetailResponse>(PRODUCT_DETAIL_QUERY, { urlKey })),
    gql<WidgetsForRouteResponse>(WIDGETS_FOR_ROUTE_QUERY, { route: ROUTE_ID, changeset })
  ]);

  if (!result.productByUrlKey) {
    throw data('Product not found', { status: 404 });
  }

  const widgets = widgetData.widgetsForRoute;
  // The three product-anchored recommendation widgets read these arrays rather
  // than issuing their own query — `PRODUCT_DETAIL_QUERY` already fetched them.
  const anchor = {
    relatedProducts: result.productByUrlKey.relatedProducts,
    crossSellProducts: result.productByUrlKey.crossSellProducts,
    upsellProducts: result.productByUrlKey.upsellProducts
  };
  const extras = mergeProductAnchorExtras(await resolveWidgetExtras(widgets, cookie), widgets, anchor);

  // TEMPORARY: `?__engine=puck` renders this route through Puck instead.
  // The anchor goes in as metadata, so under Puck the product-anchored types
  // are resolved by `resolvePuckExtras` like any other widget rather than
  // merged in afterwards by this route.
  const puck = await loadPuckForRequest(request, ROUTE_ID, { anchor });

  return { product: result.productByUrlKey, canonical: canonicalUrl(request), widgets, extras, puck };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [];
  const { product, canonical } = data;
  return buildMeta({
    title: product.metaTitle || product.name,
    description: product.metaDescription,
    canonical,
    image: product.image?.url ? imageUrl(product.image.url) : null,
    type: 'product.item'
  });
};

export default function ProductPage() {
  const { product, canonical, widgets, extras, puck } = useLoaderData<typeof loader>();
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSale =
    product.price.special != null && product.price.special.value < product.price.regular.value;

  async function handleAddToCart() {
    setStatus('adding');
    setError(null);
    try {
      await addToCart(product.sku, qty);
      setStatus('added');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          sku: product.sku,
          image: product.image ? imageUrl(product.image.url) : undefined,
          description: product.metaDescription || undefined,
          url: canonical,
          offers: {
            '@type': 'Offer',
            url: canonical,
            price: (product.price.special ?? product.price.regular).value,
            priceCurrency: product.price.regular.currency,
            availability: product.inventory.isInStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock'
          }
        }}
      />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-lg bg-muted">
            {product.image ? (
              <img
                src={imageUrl(product.image.url)}
                alt={product.image.alt ?? product.name}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          {product.gallery.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {product.gallery.map((img, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-md bg-muted">
                  <img src={imageUrl(img.url)} alt={img.alt ?? product.name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
          </div>

          <div className="flex items-center gap-2">
            {onSale ? (
              <>
                <span className="text-xl font-semibold">{product.price.special!.text}</span>
                <span className="text-sm text-muted-foreground line-through">
                  {product.price.regular.text}
                </span>
                <Badge variant="destructive">Sale</Badge>
              </>
            ) : (
              <span className="text-xl font-semibold">{product.price.regular.text}</span>
            )}
          </div>

          <p className="text-sm">
            {product.inventory.isInStock ? (
              <span className="text-foreground">In stock</span>
            ) : (
              <span className="text-destructive">Out of stock</span>
            )}
          </p>

          <Separator />

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-md border border-input">
              <button
                type="button"
                className="px-3 py-1.5 text-sm"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center text-sm">{qty}</span>
              <button
                type="button"
                className="px-3 py-1.5 text-sm"
                onClick={() => setQty((q) => q + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <Button
              disabled={!product.inventory.isInStock || status === 'adding'}
              onClick={handleAddToCart}
            >
              {status === 'adding' ? 'Adding…' : status === 'added' ? 'Added' : 'Add to cart'}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}

          {product.attributes.length > 0 && (
            <div className="space-y-2 pt-4">
              {product.attributes.map((attr) => (
                <div key={attr.attributeCode} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground">{attr.attributeName}:</span>
                  <span>{attr.options.map((o) => o.optionText).join(', ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RichContent rows={product.description as any} />

      {/* "You may also like" used to be hardcoded JSX here, duplicating what
          the `related_products` widget already does — removed in favor of a
          route-level `related_products` widget seeded onto `productView` by
          the catalog migration below, so every product page keeps the same
          default behavior but it's now a real, editable/removable widget. */}
      {puck ? (
        <PuckArea data={puck.data} metadata={puck.metadata} />
      ) : (
        <WidgetArea areaId="content" widgets={widgets} extras={extras} />
      )}
    </div>
  );
}
