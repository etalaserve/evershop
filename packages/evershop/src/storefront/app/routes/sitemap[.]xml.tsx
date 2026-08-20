import type { LoaderFunctionArgs } from 'react-router';

import { gql } from '~/lib/graphql/client.js';

const SITEMAP_QUERY = /* GraphQL */ `
  query SitemapUrls {
    products(filters: [{ key: "limit", operation: eq, value: "1000" }]) {
      items {
        urlKey
      }
    }
    categories(filters: [{ key: "limit", operation: eq, value: "500" }]) {
      items {
        urlKey
      }
    }
    blogPosts(filters: [{ key: "limit", operation: eq, value: "500" }]) {
      items {
        urlKey
      }
    }
    cmsPages(filters: [{ key: "limit", operation: eq, value: "500" }]) {
      items {
        urlKey
      }
    }
  }
`;

interface SitemapUrlsResponse {
  products: { items: Array<{ urlKey: string }> };
  categories: { items: Array<{ urlKey: string }> };
  blogPosts: { items: Array<{ urlKey: string }> };
  cmsPages: { items: Array<{ urlKey: string }> };
}

function url(loc: string): string {
  return `<url><loc>${loc}</loc></url>`;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin;
  // No caching here — a fresh product/category listing matters more for a
  // sitemap than shaving a GraphQL round trip, and crawlers hit this
  // infrequently compared to real pages.
  const result = await gql<SitemapUrlsResponse>(SITEMAP_QUERY);

  const urls = [
    url(origin),
    url(`${origin}/blog`),
    ...result.products.items.map((p) => url(`${origin}/product/${p.urlKey}`)),
    ...result.categories.items.map((c) => url(`${origin}/category/${c.urlKey}`)),
    ...result.blogPosts.items.map((b) => url(`${origin}/blog/${b.urlKey}`)),
    ...result.cmsPages.items.map((p) => url(`${origin}/page/${p.urlKey}`))
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
