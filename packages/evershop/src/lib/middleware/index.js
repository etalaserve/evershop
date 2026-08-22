import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { Handler } from './Handler.js';
import { sortMiddlewares } from './sort.js';

const middlewareList = Handler.middlewares;

/**
 * Every route folder self-registers its middleware via a `middlewares.js`
 * (compiled from `middlewares.ts`), which calls `registerMiddleware()`/
 * `defineMiddlewares()` (registry.js) as a side effect when imported — same
 * pattern a module's own `bootstrap.js` already uses.
 */
async function loadRouteMiddlewares(folder) {
  const manifestPath = resolve(folder, 'middlewares.js');
  if (existsSync(manifestPath)) {
    await import(pathToFileURL(manifestPath).toString());
  }
}

export function getAdminMiddlewares(routeId) {
  return sortMiddlewares(
    middlewareList.filter(
      (m) =>
        m.routeId === 'admin' || m.routeId === routeId || m.routeId === null
    )
  );
}

export function getFrontMiddlewares(routeId) {
  return sortMiddlewares(
    middlewareList.filter(
      (m) =>
        m.routeId === 'frontStore' ||
        m.routeId === routeId ||
        m.routeId === null
    )
  );
}

/**
 * This function scan and load all middleware function of a module base on module path
 *
 * @param   {string}  path  The path of the module
 *
 */
export async function getModuleMiddlewares(path) {
  if (existsSync(resolve(path, 'pages'))) {
    // Scan for the application level middleware
    if (existsSync(resolve(path, 'pages', 'global'))) {
      await loadRouteMiddlewares(resolve(path, 'pages', 'global'));
    }
    // Scan for the admin level middleware
    if (existsSync(resolve(path, 'pages', 'admin'))) {
      const routes = readdirSync(resolve(path, 'pages', 'admin'), {
        withFileTypes: true
      })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
      for (const route of routes) {
        // eslint-disable-next-line no-await-in-loop
        await loadRouteMiddlewares(resolve(path, 'pages', 'admin', route));
      }
    }

    // Scan for the frontStore level middleware
    if (existsSync(resolve(path, 'pages', 'frontStore'))) {
      const routes = readdirSync(resolve(path, 'pages', 'frontStore'), {
        withFileTypes: true
      })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
      for (const route of routes) {
        // eslint-disable-next-line no-await-in-loop
        await loadRouteMiddlewares(resolve(path, 'pages', 'frontStore', route));
      }
    }
  }

  // Scan for the api middleware
  if (existsSync(resolve(path, 'api'))) {
    const routes = readdirSync(resolve(path, 'api'), { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
    for (const route of routes) {
      // eslint-disable-next-line no-await-in-loop
      await loadRouteMiddlewares(resolve(path, 'api', route));
    }
  }
}

/**
 * This function return a list of sorted middleware functions (all)
 *
 * @return  {array}  List of sorted middleware functions
 */
export function getAllSortedMiddlewares() {
  return sortMiddlewares(middlewareList);
}
