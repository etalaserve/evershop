import { Link } from 'react-router';

import { Card } from '~/components/ui/card.js';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '~/components/ui/carousel.js';
import type { BlogPostCard } from '~/lib/graphql/queries/blog.js';
import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface Extra {
  eyebrow: string | null;
  heading: string | null;
  subText: string | null;
  columns: number;
  posts: BlogPostCard[];
}

function PostCard({ post }: { post: BlogPostCard }) {
  return (
    <Link to={`/blog/${post.urlKey}`} className="group block">
      <Card className="overflow-hidden rounded-xl py-0 shadow-sm transition-shadow hover:shadow-md">
        <div className="aspect-video overflow-hidden bg-muted">
          {post.thumbnail && (
            <img src={imageUrl(post.thumbnail)} alt={post.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          )}
        </div>
        <div className="space-y-1 p-3">
          <p className="line-clamp-1 text-sm font-medium">{post.name}</p>
          {post.shortDescription && <p className="line-clamp-2 text-xs text-muted-foreground">{post.shortDescription}</p>}
          <p className="text-xs text-muted-foreground">
            {post.publishedAt && new Date(post.publishedAt).toLocaleDateString()} · {post.readingTime} min read
          </p>
        </div>
      </Card>
    </Link>
  );
}

export function FeaturedBlogs({ widget, extra }: WidgetComponentProps) {
  const s = widget.rawSettings as { variant?: 'grid' | 'carousel' };
  const data = extra as Extra | null | undefined;
  if (!data || data.posts.length === 0) return null;
  const columns = Math.min(4, Math.max(1, data.columns || 3));

  return (
    <section className="space-y-4">
      {(data.eyebrow || data.heading || data.subText) && (
        <div className="space-y-1">
          {data.eyebrow && <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{data.eyebrow}</span>}
          {data.heading && <h2 className="text-lg font-semibold tracking-tight">{data.heading}</h2>}
          {data.subText && <p className="text-sm text-muted-foreground">{data.subText}</p>}
        </div>
      )}
      {s.variant === 'carousel' ? (
        <Carousel className="w-full" opts={{ align: 'start', dragFree: true }}>
          <CarouselContent>
            {data.posts.map((post) => (
              <CarouselItem key={post.uuid} className="basis-[70%] sm:basis-1/3 lg:basis-1/4">
                <PostCard post={post} />
              </CarouselItem>
            ))}
          </CarouselContent>
          {data.posts.length > columns && (
            <>
              <CarouselPrevious />
              <CarouselNext />
            </>
          )}
        </Carousel>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {data.posts.map((post) => (
            <PostCard key={post.uuid} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
