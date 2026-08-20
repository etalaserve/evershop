import { Link } from 'react-router';

import { Card } from '~/components/ui/card.js';
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

export function FeaturedBlogs({ extra }: WidgetComponentProps) {
  const data = extra as Extra | null | undefined;
  if (!data || data.posts.length === 0) return null;
  const columns = Math.min(4, Math.max(1, data.columns || 3));

  return (
    <section className="space-y-4">
      {(data.eyebrow || data.heading || data.subText) && (
        <div className="space-y-1">
          {data.eyebrow && <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{data.eyebrow}</span>}
          {data.heading && <h2 className="text-lg font-semibold">{data.heading}</h2>}
          {data.subText && <p className="text-sm text-muted-foreground">{data.subText}</p>}
        </div>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {data.posts.map((post) => (
          <Link key={post.uuid} to={`/blog/${post.urlKey}`} className="group block">
            <Card className="overflow-hidden py-0">
              <div className="aspect-video overflow-hidden bg-muted">
                {post.thumbnail && (
                  <img
                    src={imageUrl(post.thumbnail)}
                    alt={post.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
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
        ))}
      </div>
    </section>
  );
}
