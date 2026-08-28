/**
 * The checkout cart, resolved from the visitor's session.
 *
 * `myCart` rather than `cart(id:)`: this storefront no longer invents a cart
 * identifier of its own. The cart belongs to EverShop's `sid` session cookie,
 * which is same-origin and already sent with every request — so a cart id
 * would have to come from somewhere, and the `cart_id` cookie this route used
 * to read stopped being written when add-to-cart moved to the session. The
 * result was a checkout that redirected every shopper back to their cart.
 *
 * The server-side caller must forward the request's `Cookie` header;
 * graphql-request does not do it on its own. Every other session-backed route
 * here does the same (see `cart.tsx`).
 */
export const CHECKOUT_CART_QUERY = /* GraphQL */ `
  query CheckoutCart {
    myCart {
      uuid
      totalQty
      subTotal {
        value
        text
      }
      shippingFeeInclTax {
        text
      }
      grandTotal {
        text
      }
      currency
      customerEmail
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
      availablePaymentMethods {
        code
        name
      }
    }
    setting {
      stripePublishableKey
      stripePaymentMode
    }
  }
`;

export interface CheckoutCartResponse {
  myCart: {
    uuid: string;
    totalQty: number;
    subTotal: { value: number; text: string };
    shippingFeeInclTax: { text: string };
    grandTotal: { text: string };
    currency: string;
    customerEmail: string | null;
    items: Array<{
      uuid: string;
      productName: string | null;
      productSku: string;
      thumbnail: string | null;
      qty: number;
      finalPrice: { text: string };
      lineTotal: { text: string };
    }> | null;
    availablePaymentMethods: Array<{ code: string; name: string }>;
  } | null;
  setting: {
    stripePublishableKey: string | null;
    stripePaymentMode: string | null;
  };
}

export const SHIPPING_METHODS_QUERY = /* GraphQL */ `
  query ShippingMethods($id: String!, $country: String, $province: String, $postcode: String) {
    cart(id: $id) {
      availableShippingMethods(country: $country, province: $province, postcode: $postcode) {
        id
        providerCode
        code
        name
        cost {
          value
          text
        }
        carrier
      }
    }
  }
`;

export interface ShippingMethodsResponse {
  cart: {
    availableShippingMethods: Array<{
      id: string;
      providerCode: string;
      code: string;
      name: string;
      cost: { value: number; text: string };
      carrier: string | null;
    }>;
  } | null;
}

export const ORDER_QUERY = /* GraphQL */ `
  query OrderDetail($uuid: String!) {
    order(uuid: $uuid) {
      uuid
      orderNumber
      status {
        name
      }
      createdAt {
        text
      }
      customerEmail
      customerFullName
      subTotal {
        text
      }
      shippingFeeInclTax {
        text
      }
      grandTotal {
        text
      }
      paymentMethodName
      shippingMethodName
      shippingAddress {
        fullName
        address1
        address2
        city
        postcode
        telephone
        country {
          name
        }
        province {
          name
        }
      }
      items {
        uuid
        productName
        productSku
        thumbnail
        qty
        lineTotal {
          text
        }
      }
    }
  }
`;

export interface OrderDetailResponse {
  order: {
    uuid: string;
    orderNumber: string;
    status: { name: string } | null;
    createdAt: { text: string };
    customerEmail: string | null;
    customerFullName: string | null;
    subTotal: { text: string };
    shippingFeeInclTax: { text: string };
    grandTotal: { text: string };
    paymentMethodName: string | null;
    shippingMethodName: string | null;
    shippingAddress: {
      fullName: string | null;
      address1: string | null;
      address2: string | null;
      city: string | null;
      postcode: string | null;
      telephone: string | null;
      country: { name: string } | null;
      province: { name: string } | null;
    } | null;
    items: Array<{
      uuid: string;
      productName: string | null;
      productSku: string;
      thumbnail: string | null;
      qty: number;
      lineTotal: { text: string };
    }> | null;
  } | null;
}
