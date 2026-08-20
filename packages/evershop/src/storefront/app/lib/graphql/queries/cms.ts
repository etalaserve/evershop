/**
 * `cmsPage(id:)` takes a numeric id, and `currentCmsPage` is page-context-bound
 * — neither works for a headless client with only a slug. `cmsPageByUrlKey`
 * is the additive lookup (`packages/evershop/src/modules/headless/graphql/types/CmsPageLookup`).
 */
export const CMS_PAGE_QUERY = /* GraphQL */ `
  query CmsPageDetail($urlKey: String!) {
    cmsPageByUrlKey(urlKey: $urlKey) {
      uuid
      urlKey
      name
      content
      metaTitle
      metaDescription
    }
  }
`;

export interface CmsPageResponse {
  cmsPageByUrlKey: {
    uuid: string;
    urlKey: string;
    name: string;
    content: unknown;
    metaTitle: string | null;
    metaDescription: string | null;
  } | null;
}
