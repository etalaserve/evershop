export interface BlogPostCard {
  uuid: string;
  name: string;
  urlKey: string;
  shortDescription: string | null;
  thumbnail: string | null;
  publishedAt: string | null;
  readingTime: number;
}

export const BLOG_POST_CARD_FIELDS = /* GraphQL */ `
  uuid
  name
  urlKey
  shortDescription
  thumbnail
  publishedAt
  readingTime
`;

export const BLOG_LIST_QUERY = /* GraphQL */ `
  query BlogList($page: ID) {
    blogPosts(filters: [{ key: "page", operation: eq, value: $page }]) {
      items {
        ${BLOG_POST_CARD_FIELDS}
      }
      total
    }
  }
`;

export interface BlogListResponse {
  blogPosts: { items: BlogPostCard[]; total: number };
}

/**
 * `blogPost(id:)` takes a uuid, and `currentBlogPost` is page-context-bound —
 * neither works for a headless client with only a slug. `blogPostByUrlKey`
 * is the additive lookup (`packages/evershop/src/modules/headless/graphql/types/BlogPostLookup`).
 */
export const BLOG_POST_QUERY = /* GraphQL */ `
  query BlogPostDetail($urlKey: String!) {
    blogPostByUrlKey(urlKey: $urlKey) {
      uuid
      name
      urlKey
      description
      metaTitle
      metaDescription
      thumbnail
      publishedAt
      readingTime
      author {
        fullName
      }
      category {
        name
      }
      tags {
        name
      }
      related(limit: 3) {
        ${BLOG_POST_CARD_FIELDS}
      }
    }
  }
`;

export interface BlogPostDetailResponse {
  blogPostByUrlKey: {
    uuid: string;
    name: string;
    urlKey: string;
    description: unknown;
    metaTitle: string | null;
    metaDescription: string | null;
    thumbnail: string | null;
    publishedAt: string | null;
    readingTime: number;
    author: { fullName: string | null } | null;
    category: { name: string } | null;
    tags: Array<{ name: string }>;
    related: BlogPostCard[];
  } | null;
}
