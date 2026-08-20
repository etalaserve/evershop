export const CURRENT_CUSTOMER_QUERY = /* GraphQL */ `
  query CurrentCustomer {
    currentCustomer {
      customerId
      uuid
      email
      fullName
      createdAt {
        text
      }
      addAddressApi
      updateProfileApi
      addresses {
        uuid
        fullName
        telephone
        address1
        address2
        city
        postcode
        isDefault
        country {
          code
          name
        }
        province {
          code
          name
        }
        updateApi
        deleteApi
      }
    }
  }
`;

export interface CurrentCustomerAddress {
  uuid: string;
  fullName: string | null;
  telephone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  postcode: string | null;
  isDefault: boolean | null;
  country: { code: string; name: string } | null;
  province: { code: string; name: string } | null;
  updateApi: string;
  deleteApi: string;
}

export interface CurrentCustomerResponse {
  currentCustomer: {
    customerId: number;
    uuid: string;
    email: string;
    fullName: string;
    createdAt: { text: string };
    addAddressApi: string;
    updateProfileApi: string;
    addresses: CurrentCustomerAddress[];
  } | null;
}

export const CUSTOMER_ORDERS_QUERY = /* GraphQL */ `
  query CustomerOrders {
    currentCustomer {
      orders {
        uuid
        orderNumber
        status {
          name
        }
        grandTotal {
          text
        }
        createdAt {
          text
        }
        totalQty
      }
    }
  }
`;

export interface CustomerOrdersResponse {
  currentCustomer: {
    orders: Array<{
      uuid: string;
      orderNumber: string;
      status: { name: string } | null;
      grandTotal: { text: string };
      createdAt: { text: string };
      totalQty: number;
    }>;
  } | null;
}

export const COUNTRIES_QUERY = /* GraphQL */ `
  query Countries {
    countries {
      code
      name
    }
  }
`;

export interface CountriesResponse {
  countries: Array<{ code: string; name: string }>;
}

export const PROVINCES_QUERY = /* GraphQL */ `
  query Provinces($countries: [String]) {
    provinces(countries: $countries) {
      code
      name
      countryCode
    }
  }
`;

export interface ProvincesResponse {
  provinces: Array<{ code: string; name: string; countryCode: string }>;
}
