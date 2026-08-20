export const CHECKOUT_CART_QUERY = /* GraphQL */ `
  query CheckoutCart($id: String!) {
    cart(id: $id) {
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
  cart: {
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
