import type { WidgetComponentProps } from '~/lib/widgets/registry.js';
import { CommercePlaceholder } from './CommercePlaceholder.js';

/**
 * A post's category, title and byline.
 *
 * Every part is conditional exactly as the route had it: a post may have no
 * category, no author, or no publish date (a draft preview), and the byline
 * must not render stray separators for the missing ones.
 */
export function BlogPostHeader({ page }: WidgetComponentProps) {
  const post = page?.post?.post;
  if (!post) return <CommercePlaceholder label="Post title and byline" />;

  return (
    <div className="space-y-2">
      {post.category && (
        <p className="text-sm text-muted-foreground">{post.category.name}</p>
      )}
      <h1 className="text-3xl font-semibold">{post.name}</h1>
      <p className="text-sm text-muted-foreground">
        {post.author?.fullName && <>By {post.author.fullName} · </>}
        {post.publishedAt && new Date(post.publishedAt).toLocaleDateString()} ·{' '}
        {post.readingTime} min read
      </p>
    </div>
  );
}
