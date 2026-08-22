import { ProductCard } from '~/components/catalog/product-card.js';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '~/components/ui/carousel.js';
import type { ProductCard as ProductCardData } from '~/lib/graphql/queries/catalog.js';

/**
 * Horizontal scrolling product rail — the "Carousel" variant shared by
 * every product-grid-shaped widget (`CollectionProducts`, `CollectionStack`,
 * `RecommendationShelf`, `FeaturedBlogs`'s carousel branch), so the same
 * embla-backed markup isn't duplicated four times.
 */
export function ProductRail({ products, columns = 4 }: { products: ProductCardData[]; columns?: number }) {
  if (products.length === 0) return null;
  const basis = columns >= 5 ? 'basis-[45%] sm:basis-1/3 lg:basis-1/5' : columns === 4 ? 'basis-[45%] sm:basis-1/3 lg:basis-1/4' : 'basis-[70%] sm:basis-1/2 lg:basis-1/3';

  return (
    <Carousel className="w-full" opts={{ align: 'start', dragFree: true }}>
      <CarouselContent>
        {products.map((product) => (
          <CarouselItem key={product.productId} className={basis}>
            <ProductCard product={product} />
          </CarouselItem>
        ))}
      </CarouselContent>
      {products.length > columns && (
        <>
          <CarouselPrevious />
          <CarouselNext />
        </>
      )}
    </Carousel>
  );
}
