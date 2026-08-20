import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData
} from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { Footer } from '~/components/layout/footer.js';
import { Header } from '~/components/layout/header.js';
import { CACHE_TTL, cached } from '~/lib/cache/middleware.js';
import { gql } from '~/lib/graphql/client.js';
import {
  CATEGORY_NAV_QUERY,
  type CategoryNavResponse
} from '~/lib/graphql/queries/catalog.js';
import { STORE_SETTINGS_QUERY, type StoreSettingsResponse } from '~/lib/graphql/queries/settings.js';
import { PageBuilderBridge } from '~/lib/page-builder/PageBuilderBridge.js';
import { PreviewProvider } from '~/lib/page-builder/PreviewContext.js';
import { ThemeStyle } from '~/lib/theme/provider.js';
import { resolveThemeTokens } from '~/lib/theme/tokens.js';
import '~/lib/widgets/bootstrap.js';

import appCss from './app.css?url';

export const links = () => [{ rel: 'stylesheet', href: appCss }];

export async function loader(_args: LoaderFunctionArgs) {
  // Fragment cache: shared chrome (nav, theme, store name) rarely changes —
  // long TTL, refreshed automatically when the admin saves settings via
  // CACHE_TTL.fragment expiry (no live invalidation wired up yet, see
  // lib/cache/middleware.ts).
  const [settings, nav] = await Promise.all([
    cached('fragment:settings', CACHE_TTL.fragment, () =>
      gql<StoreSettingsResponse>(STORE_SETTINGS_QUERY)
    ),
    cached('fragment:category-nav', CACHE_TTL.fragment, () =>
      gql<CategoryNavResponse>(CATEGORY_NAV_QUERY)
    )
  ]);

  return {
    storeName: settings.setting.storeName || 'Store',
    themeTokens: resolveThemeTokens(settings.setting.themeTokens),
    categories: nav.categories.items.map((c) => ({
      categoryId: c.categoryId,
      name: c.name,
      urlKey: c.urlKey
    }))
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { storeName, themeTokens, categories } = useLoaderData<typeof loader>();
  return (
    <PreviewProvider>
      <PageBuilderBridge />
      <ThemeStyle tokens={themeTokens} />
      <div className="flex min-h-screen flex-col">
        <Header storeName={storeName} categories={categories} />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer storeName={storeName} />
      </div>
    </PreviewProvider>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details = error.status === 404 ? 'The requested page could not be found.' : error.statusText;
  } else if (error instanceof Error) {
    details = error.message;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-2xl font-semibold">{message}</h1>
      <p className="text-muted-foreground">{details}</p>
    </main>
  );
}
