import { defineMiddlewares } from '../../../../lib/middleware/registry.js';
import context from './context.js';
import errorHandler from './errorHandler.js';
import notFound from './notFound.js';
import response from './response.js';

/**
 * The cross-cutting pipeline every non-API page request passes through,
 * replacing what used to be encoded in these files' bracket-bracket
 * filenames (`[auth]notFound[response].ts`, `response[errorHandler].ts`,
 * `[response]errorHandler.js`). `context`/`errorHandler` have no
 * before/after (both were excluded from `parseFromFile.js`'s
 * default-assignment, id-checked by name); `response`'s `after: ['auth']`
 * was an IMPLICIT default (`parseFromFile.js` fills in `after: ['auth']`
 * whenever a page-region middleware's filename doesn't already specify one)
 * — made explicit here since there's no longer a filename to imply it.
 *
 * `notFound`'s `after: ['auth']` is preserved as-is even though no
 * page-scoped `auth` middleware exists anywhere in this codebase — a
 * pre-existing dangling dependency (confirmed via exhaustive search) that
 * silently excludes `notFound` from ever running today, since its job is
 * already covered by `addDefaultMiddlewareFuncs.ts`'s own 404 handler. This
 * migration preserves that exact (surprising) behavior rather than
 * silently "fixing" it as a side effect of a pure renaming refactor.
 */
defineMiddlewares(
  { region: 'pages', scope: 'app', routeId: null },
  [
    { id: 'context', handler: context },
    { id: 'notFound', after: ['auth'], before: ['response'], handler: notFound },
    { id: 'response', after: ['auth'], before: ['errorHandler'], handler: response },
    { id: 'errorHandler', after: ['response'], handler: errorHandler }
  ]
);
