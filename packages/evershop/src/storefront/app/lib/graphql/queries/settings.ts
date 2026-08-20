import type { ThemeTokens } from '~/lib/theme/tokens.js';

export const STORE_SETTINGS_QUERY = /* GraphQL */ `
  query StoreSettings {
    setting {
      storeName
      storeDescription
      logo
      favicon
      themeTokens
    }
  }
`;

export interface StoreSettingsResponse {
  setting: {
    storeName: string;
    storeDescription: string | null;
    logo: string | null;
    favicon: string | null;
    themeTokens: Partial<ThemeTokens> | null;
  };
}
