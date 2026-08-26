import { RichContent } from '~/components/content/rich-content.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';
import { CommercePlaceholder } from './CommercePlaceholder.js';

/** The post body, rendered from its stored block content. */
export function BlogPostBody({ page }: WidgetComponentProps) {
  const post = page?.post?.post;
  if (!post) return <CommercePlaceholder label="Post body" />;

  return <RichContent rows={post.description as never} />;
}
