import { error } from '../log/logger.js';
import { hasDelegate, setDelegate } from './delegate.js';
import eNext from './eNext.js';

/**
 * Sibling of `buildMiddlewareFunction.js` for the explicit
 * `registerMiddleware()` convention (see `registry.js`) — same
 * debug-timing/error-handling wrapper, but takes an already-imported
 * function reference instead of a file path, so there's no per-request
 * dynamic `import()` at all. This is what makes migrated middleware immune
 * to the dev-mode `?t=${Date.now()}` cache-busting cost `buildMiddlewareFunction.js`
 * pays on every request (see that file for why the bracket-file convention
 * needs it and this one doesn't).
 *
 * `isRoutedLevel` mirrors the same 404-skip behavior `buildMiddlewareFunction.js`
 * derives from folder position (`!['all','global'].includes(...)`) — here
 * it's just `routeId !== null`, since `registerMiddleware()` callers already
 * know whether they're registering route-specific or global/app-scoped
 * middleware (global ones — notFound/errorHandler/response — must still run
 * on a 404; route-specific ones should skip once the destination is already
 * known not to exist).
 */
export function buildMiddlewareFunctionFromHandler(id, handler, routeId) {
  if (!/^[a-zA-Z0-9_]+$/.test(id)) {
    throw new TypeError(`Middleware ID ${id} is invalid`);
  }

  const isRoutedLevel = routeId !== null;

  if (handler.length === 4) {
    // Error-handler middleware: (err, request, response, next)
    return async (err, request, response, next) => {
      await handler(err, request, response, next);
    };
  }

  return async (request, response, next) => {
    const startTime = process.hrtime();
    const debuging = { id };
    response.debugMiddlewares.push(debuging);
    if (response.statusCode === 404 && isRoutedLevel) {
      next();
      return;
    }
    try {
      if (handler.length === 3) {
        await handler(request, response, (err) => {
          const endTime = process.hrtime(startTime);
          debuging.time = endTime[1] / 1000000;
          eNext(request, response, next)(err);
        });
      } else {
        const returnValue = await handler(request, response);
        if (!hasDelegate(id, request)) {
          setDelegate(id, returnValue, request);
        }
        const endTime = process.hrtime(startTime);
        debuging.time = endTime[1] / 1000000;
        eNext(request, response, next)();
      }
    } catch (e) {
      e.message = `Exception in middleware ${id}: ${e.message}`;
      error(e);
      next(e);
    }
  };
}
