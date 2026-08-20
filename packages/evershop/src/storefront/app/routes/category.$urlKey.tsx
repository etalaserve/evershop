import { data, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';

import { ProductGrid } from '~/components/catalog/product-grid.js';
import { CACHE_TTL, cached } from '~/lib/cache/middleware.js';
import { gql } from '~/lib/graphql/client.js';
import { CATEGORY_BY_URL_KEY_QUERY, type CategoryPageResponse } from '~/lib/graphql/queries/catalog.js';
import { imageUrl } from '~/lib/image.js';
import { buildMeta, canonicalUrl } from '~/lib/seo.js';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const urlKey = params.urlKey!;
  const page = new URL(request.url).searchParams.get('page') ?? '1';

  const result = await cached(`page:category:${urlKey}:${page}`, CACHE_TTL.page, () =>
    gql<CategoryPageResponse>(CATEGORY_BY_URL_KEY_QUERY, { urlKey, page, limit: '24' })
  );

  if (!result.categoryByUrlKey) {
    throw data('Category not found', { status: 404 });
  }

  return { category: result.categoryByUrlKey, canonical: canonicalUrl(request) };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [];
  const { category, canonical } = data;
  return buildMeta({
    title: category.metaTitle || category.name,
    description: category.metaDescription,
    canonical,
    image: category.image?.url ? imageUrl(category.image.url) : null
  });
};

export default function CategoryPage() {
  const { category } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{category.name}</h1>
        <p className="text-sm text-muted-foreground">{category.products.total} products</p>
      </div>
      <ProductGrid products={category.products.items} />
    </div>
  );
}
