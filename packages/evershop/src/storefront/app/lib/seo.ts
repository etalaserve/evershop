import type { MetaDescriptor } from 'react-router';

export interface SeoInput {
  title: string;
  description?: string | null;
  /** Absolute canonical URL — build with `canonicalUrl()` from the request. */
  canonical?: string;
  image?: string | null;
  type?: 'website' | 'article' | 'product.item';
  /** Anonymous/checkout/account pages that shouldn't be indexed. */
  noindex?: boolean;
}

/**
 * One shared builder for every route's `meta` export — title, description,
 * canonical link, Open Graph, and Twitter card tags, all from one input
 * object instead of each route hand-rolling its own descriptor array.
 */
export function buildMeta({
  title,
  description,
  canonical,
  image,
  type = 'website',
  noindex = false
}: SeoInput): MetaDescriptor[] {
  const tags: MetaDescriptor[] = [
    { title },
    { name: 'description', content: description ?? '' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description ?? '' },
    { property: 'og:type', content: type },
    { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description ?? '' }
  ];
  if (canonical) {
    tags.push({ tagName: 'link', rel: 'canonical', href: canonical });
    tags.push({ property: 'og:url', content: canonical });
  }
  if (image) {
    tags.push({ property: 'og:image', content: image });
    tags.push({ name: 'twitter:image', content: image });
  }
  if (noindex) {
    tags.push({ name: 'robots', content: 'noindex, nofollow' });
  }
  return tags;
}

/**
 * Absolute URL for the current request — used as the canonical link and
 * og:url. Preserves `page` when it's a paginated listing beyond page 1 —
 * stripping it entirely (as this used to) makes every page of a paginated
 * category/blog listing self-canonicalize to page 1, telling crawlers to
 * drop that page's own products/posts from the index. Every other query
 * param (utm_*, sort, filters, etc.) is intentionally dropped — those
 * shouldn't fragment indexing into near-duplicate canonical targets.
 */
export function canonicalUrl(request: Request): string {
  const url = new URL(request.url);
  const page = url.searchParams.get('page');
  const search = page && page !== '1' ? `?page=${encodeURIComponent(page)}` : '';
  return `${url.origin}${url.pathname}${search}`;
}
