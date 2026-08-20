import { useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';

import { ProductGrid } from '~/components/catalog/product-grid.js';
import { gql } from '~/lib/graphql/client.js';
import { SEARCH_QUERY, type SearchResponse } from '~/lib/graphql/queries/catalog.js';
import { buildMeta } from '~/lib/seo.js';

// Query-driven, thin/duplicate content — never indexed.
export const meta: MetaFunction = () => buildMeta({ title: 'Search', noindex: true });

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('q') ?? '';
  const page = url.searchParams.get('page') ?? '1';

  if (!keyword) {
    return { keyword, products: [], total: 0 };
  }

  // Search results are per-query and change with the catalog — no cache,
  // unlike the catalog/home pages (CACHE_TTL.page would go stale as soon as
  // a product's stock/price changes and a shopper searched a common term).
  const result = await gql<SearchResponse>(SEARCH_QUERY, { keyword, page });
  return { keyword, products: result.products.items, total: result.products.total };
}

export default function SearchPage() {
  const { keyword, products, total } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {keyword ? `Results for "${keyword}"` : 'Search'}
        </h1>
        {keyword && <p className="text-sm text-muted-foreground">{total} products</p>}
      </div>
      <ProductGrid products={products} />
    </div>
  );
}
