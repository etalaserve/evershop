import { Link } from 'react-router';

import { ProductCard } from '~/components/catalog/product-card.js';
import { AspectRatio } from '~/components/ui/aspect-ratio.js';
import { Button } from '~/components/ui/button.js';
import type { ProductCard as ProductCardData } from '~/lib/graphql/queries/catalog.js';
import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface Extra {
  image: string | null;
  imageAlt: string | null;
  imagePosition: 'left' | 'right';
  eyebrow: string | null;
  heading: string;
  body: string | null;
  collectionName: string | null;
  totalProducts: number;
  viewAllLink: string | null;
  viewAllLabel: string | null;
  previewProducts: ProductCardData[];
}

export function CollectionSpotlight({ extra }: WidgetComponentProps) {
  const data = extra as Extra | null | undefined;
  if (!data || !data.heading) return null;

  const image = (
    <AspectRatio ratio={4 / 5} className="overflow-hidden rounded-lg bg-muted">
      {data.image && <img src={imageUrl(data.image)} alt={data.imageAlt ?? ''} className="h-full w-full object-cover" />}
    </AspectRatio>
  );

  const copy = (
    <div className="flex flex-col justify-center gap-3">
      {data.eyebrow && <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{data.eyebrow}</span>}
      <h2 className="text-2xl font-semibold sm:text-3xl">{data.heading}</h2>
      {data.body && <p className="text-muted-foreground">{data.body}</p>}
      {data.previewProducts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          {data.previewProducts.map((product) => (
            <ProductCard key={product.productId} product={product} />
          ))}
        </div>
      )}
      {data.viewAllLink && (
        <Button asChild variant="outline" className="mt-2 w-fit">
          <Link to={data.viewAllLink}>{data.viewAllLabel || `View all ${data.totalProducts} →`}</Link>
        </Button>
      )}
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
