/**
 * `myCart` resolves from EverShop's own `sid` session cookie — same-origin
 * now that the storefront runs in-process, so a same-origin request already
 * carries it automatically. Server-side loaders must still forward the
 * incoming request's Cookie header explicitly (graphql-request doesn't ride
 * cookies the way a browser fetch does) — see `gql()`'s `headers` param.
 */
export const CART_QUERY = /* GraphQL */ `
  query MyCart {
    myCart {
      uuid
      totalQty
      subTotal {
        text
      }
      grandTotal {
        text
      }
      items {
        uuid
        productName
        productSku
        thumbnail
        qty
        finalPrice {
          text
        }
        lineTotal {
          text
        }
      }
    }
  }
`;

export interface CartResponse {
  myCart: {
    uuid: string;
    totalQty: number;
    subTotal: { text: string };
    grandTotal: { text: string };
    items: Array<{
      uuid: string;
      productName: string | null;
      productSku: string;
      thumbnail: string | null;
      qty: number;
      finalPrice: { text: string };
      lineTotal: { text: string };
    }> | null;
  } | null;
}
