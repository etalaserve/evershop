import { Link, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { WidgetArea } from '~/components/widgets/WidgetArea.js';
import { PuckArea } from '~/components/widgets/PuckArea.js';
import { loadPuckForRequest } from '~/lib/puck/engineSwitch.js';
import { CACHE_TTL, cached } from '~/lib/cache/middleware.js';
import { gql } from '~/lib/graphql/client.js';
import { BLOG_LIST_QUERY, type BlogListResponse } from '~/lib/graphql/queries/blog.js';
import { WIDGETS_FOR_ROUTE_QUERY, type WidgetsForRouteResponse } from '~/lib/graphql/queries/widgets.js';
import { imageUrl } from '~/lib/image.js';
import { buildMeta, canonicalUrl } from '~/lib/seo.js';
import { resolveWidgetExtras } from '~/lib/widgets/resolveWidgetExtras.js';

// Matches `blogHome`'s legacy route id (`editable: true`).
const ROUTE_ID = 'blogHome';

export async function loader({ request }: LoaderFunctionArgs) {
  const page = new URL(request.url).searchParams.get('page') ?? '1';
  const changeset = new URL(request.url).searchParams.get('changeset');
  const cookie = request.headers.get('Cookie');

  const [result, widgetData] = await Promise.all([
    cached(`page:blog:${page}`, CACHE_TTL.page, () => gql<BlogListResponse>(BLOG_LIST_QUERY, { page })),
    gql<WidgetsForRouteResponse>(WIDGETS_FOR_ROUTE_QUERY, { route: ROUTE_ID, changeset })
  ]);

  const widgets = widgetData.widgetsForRoute;
  const extras = await resolveWidgetExtras(widgets, cookie);

  // TEMPORARY: `?__engine=puck` renders this route through Puck instead.

  const puck = await loadPuckForRequest(request, ROUTE_ID);


  return { posts: result.blogPosts.items, canonical: canonicalUrl(request), widgets, extras, puck };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [];
  return buildMeta({ title: 'Blog', description: 'Latest news and articles.', canonical: data.canonical });
};

export default function BlogIndex() {
  const { posts, widgets, extras, puck } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Blog</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {posts.map((post) => (
          <Link key={post.uuid} to={`/blog/${post.urlKey}`} className="group block space-y-2">
            <div className="aspect-video overflow-hidden rounded-lg bg-muted">
              {post.thumbnail && (
                <img
                  src={imageUrl(post.thumbnail)}
                  alt={post.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
            </div>
            <h2 className="font-medium">{post.name}</h2>
            {post.shortDescription && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{post.shortDescription}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {post.publishedAt && new Date(post.publishedAt).toLocaleDateString()} · {post.readingTime} min read
            </p>
          </Link>
        ))}
      </div>
      {puck ? (
        <PuckArea data={puck.data} metadata={puck.metadata} />
      ) : (
        <WidgetArea areaId="content" widgets={widgets} extras={extras} />
      )}
    </div>
  );
}
