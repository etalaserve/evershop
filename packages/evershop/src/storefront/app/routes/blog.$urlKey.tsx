import { data, Link, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';

import { JsonLd } from '~/components/content/json-ld.js';
import { RichContent } from '~/components/content/rich-content.js';
import { CACHE_TTL, cached } from '~/lib/cache/middleware.js';
import { gql } from '~/lib/graphql/client.js';
import { BLOG_POST_QUERY, type BlogPostDetailResponse } from '~/lib/graphql/queries/blog.js';
import { imageUrl } from '~/lib/image.js';
import { buildMeta, canonicalUrl } from '~/lib/seo.js';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const urlKey = params.urlKey!;
  const result = await cached(`data:blog-post:${urlKey}`, CACHE_TTL.data, () =>
    gql<BlogPostDetailResponse>(BLOG_POST_QUERY, { urlKey })
  );
  if (!result.blogPostByUrlKey) {
    throw data('Post not found', { status: 404 });
  }
  return { post: result.blogPostByUrlKey, canonical: canonicalUrl(request) };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [];
  const { post, canonical } = data;
  return buildMeta({
    title: post.metaTitle || post.name,
    description: post.metaDescription,
    canonical,
    image: post.thumbnail ? imageUrl(post.thumbnail) : null,
    type: 'article'
  });
};

export default function BlogPostPage() {
  const { post } = useLoaderData<typeof loader>();

  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.name,
          image: post.thumbnail ? imageUrl(post.thumbnail) : undefined,
          datePublished: post.publishedAt || undefined,
          author: post.author?.fullName ? { '@type': 'Person', name: post.author.fullName } : undefined
        }}
      />
      <div className="space-y-2">
        {post.category && <p className="text-sm text-muted-foreground">{post.category.name}</p>}
        <h1 className="text-3xl font-semibold">{post.name}</h1>
        <p className="text-sm text-muted-foreground">
          {post.author?.fullName && <>By {post.author.fullName} · </>}
          {post.publishedAt && new Date(post.publishedAt).toLocaleDateString()} · {post.readingTime} min read
        </p>
      </div>
      {post.thumbnail && (
        <div className="aspect-video overflow-hidden rounded-lg bg-muted">
          <img src={imageUrl(post.thumbnail)} alt={post.name} className="h-full w-full object-cover" />
        </div>
      )}
      <RichContent rows={post.description as any} />
      {post.tags.length > 0 && (
        <div className="flex gap-2 text-xs text-muted-foreground">
          {post.tags.map((tag) => (
            <span key={tag.name} className="rounded-full border border-border px-2 py-1">
              {tag.name}
            </span>
          ))}
        </div>
      )}
      {post.related.length > 0 && (
        <div className="space-y-3 border-t border-border pt-6">
          <h2 className="font-semibold">Related posts</h2>
          <div className="space-y-2">
            {post.related.map((r) => (
              <Link key={r.uuid} to={`/blog/${r.urlKey}`} className="block text-sm hover:underline">
                {r.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
