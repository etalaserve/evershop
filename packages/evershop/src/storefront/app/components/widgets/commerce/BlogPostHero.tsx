import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';
import { CommercePlaceholder } from './CommercePlaceholder.js';

/**
 * The post's hero image.
 *
 * Renders nothing when the post has no thumbnail — unlike the product gallery,
 * which holds its box open. A post without an image should close the gap
 * rather than leave a grey rectangle, which is what the route did.
 */
export function BlogPostHero({ page }: WidgetComponentProps) {
  const post = page?.post?.post;
  if (!post) return <CommercePlaceholder label="Post hero image" />;
  if (!post.thumbnail) return null;

  return (
    <div className="aspect-video overflow-hidden rounded-lg bg-muted">
      <img
        src={imageUrl(post.thumbnail)}
        alt={post.name}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
