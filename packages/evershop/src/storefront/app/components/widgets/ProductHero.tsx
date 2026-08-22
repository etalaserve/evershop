import { Link } from 'react-router';

import { AspectRatio } from '~/components/ui/aspect-ratio.js';
import { Badge } from '~/components/ui/badge.js';
import { Button } from '~/components/ui/button.js';
import type { ProductCard as ProductCardData } from '~/lib/graphql/queries/catalog.js';
import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface Extra {
  image: string | null;
  imageAlt: string | null;
  eyebrow: string | null;
  copy: string | null;
  imagePosition: 'left' | 'right';
  product: ProductCardData | null;
}

/** Read-only mini-PDP spotlight — no add-to-cart/variant picking, just a "View details" link to the real PDP. */
export function ProductHero({ extra }: WidgetComponentProps) {
  const data = extra as Extra | null | undefined;
  if (!data || !data.product) return null;
  const { product } = data;
  const onSale = product.price.special != null && product.price.special.value < product.price.regular.value;
  const heroImage = data.image || product.image?.url;

  const image = (
    <AspectRatio ratio={1} className="overflow-hidden rounded-xl bg-muted shadow-sm">
      {heroImage && <img src={imageUrl(heroImage)} alt={data.imageAlt || product.name} className="h-full w-full object-cover" />}
    </AspectRatio>
  );

  const copy = (
    <div className="flex flex-col justify-center gap-3">
      {data.eyebrow && <Badge variant="secondary" className="w-fit text-[10px] font-semibold uppercase tracking-wide">{data.eyebrow}</Badge>}
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h2>
      <div className="flex items-center gap-2">
        {onSale ? (
          <>
            <span className="text-lg font-semibold">{product.price.special!.text}</span>
            <span className="text-sm text-muted-foreground line-through">{product.price.regular.text}</span>
            <Badge variant="destructive">Sale</Badge>
          </>
        ) : (
          <span className="text-lg font-semibold">{product.price.regular.text}</span>
        )}
      </div>
      {data.copy && <p className="text-muted-foreground">{data.copy}</p>}
      <Button asChild className="mt-2 w-fit">
        <Link to={`/product/${product.urlKey}`}>View details</Link>
      </Button>
    </div>
  );

  return (
    <div className="grid gap-8 py-8 md:grid-cols-2">
      {data.imagePosition === 'right' ? (
        <>
          {copy}
          {image}
        </>
      ) : (
        <>
          {image}
          {copy}
        </>
      )}
    </div>
  );
}
