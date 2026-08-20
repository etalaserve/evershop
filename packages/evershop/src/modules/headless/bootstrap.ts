/**
 * Public headless-client API surface (specifications: this rewrite's plan).
 * Nothing to register — this module only extends the GraphQL schema with
 * direct-lookup queries (`productByUrlKey`, `categoryByUrlKey`) that a
 * headless storefront needs but the page-context-bound core resolvers
 * (`product`, `category`, `productSearch`) don't provide.
 */
export default function bootstrap() {}
