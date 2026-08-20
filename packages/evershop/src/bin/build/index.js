import { existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from 'config';
import spawn from 'cross-spawn';
import { CONSTANTS } from '../../lib/helpers.js';
import { error } from '../../lib/log/logger.js';
import { loadModuleRoutes } from '../../lib/router/loadModuleRoutes.js';
import { getRoutes } from '../../lib/router/Router.js';
import { lockHooks } from '../../lib/util/hookable.js';
import { lockRegistry } from '../../lib/util/registry.js';
import { validateConfiguration } from '../../lib/util/validateConfiguration.js';
import { isBuildRequired } from '../../lib/webpack/isBuildRequired.js';
import { lockCarrierRegistry } from '../../modules/oms/services/carrier/registry.js';
import { getEnabledExtensions } from '../extension/index.js';
import { loadBootstrapScript } from '../lib/bootstrap/bootstrap.js';
import { buildEntry } from '../lib/buildEntry.js';
import { getCoreModules } from '../lib/loadModules.js';
import { compile } from './complie.js';
import './initEnvBuild.js';

/* Loading modules and initilize routes, components */
const modules = [...getCoreModules(), ...getEnabledExtensions()];

/** Loading routes  */
modules.forEach((module) => {
  try {
    // Load routes
    loadModuleRoutes(module.path);
  } catch (e) {
    error(e);
    process.exit(0);
  }
});

/** Clean up the build directory */
if (existsSync(path.resolve(CONSTANTS.BUILDPATH))) {
  // Delete directory recursively
  rmSync(path.resolve(CONSTANTS.BUILDPATH), { recursive: true });
  mkdirSync(path.resolve(CONSTANTS.BUILDPATH));
} else {
  mkdirSync(path.resolve(CONSTANTS.BUILDPATH), { recursive: true });
}
export default async function build() {
  /** Loading bootstrap script from modules */
  try {
    for (const module of modules) {
      await loadBootstrapScript(module, {
        command: 'build',
        env: 'production',
        process: 'main'
      });
    }
    lockHooks();
    lockRegistry();
    lockCarrierRegistry();
    // Get the configuration (nodeconfig)
    validateConfiguration(config);
  } catch (e) {
    error(e);
    process.exit(1);
  }
  process.env.ALLOW_CONFIG_MUTATIONS = false;

  const routes = getRoutes();
  await buildEntry(routes.filter((r) => isBuildRequired(r)));

  /** Build  */
  await compile(routes);

  /** Build the in-process storefront (React Router v7 + Vite) */
  await buildStorefront();
}

/**
 * Runs `react-router build` against the storefront's own vite.config.ts,
 * writing `src/storefront/build/{client,server}`. Separate from the
 * Webpack `compile()` above — the storefront isn't part of the route-based
 * Area/Webpack pipeline, it's a standalone Vite project living alongside it
 * (see createStorefrontMiddleware.ts for how the two are stitched together
 * at request time).
 */
async function buildStorefront() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // dist/bin/build -> dist/bin -> dist -> package root
  const packageRoot = path.resolve(__dirname, '..', '..', '..');
  const storefrontRoot = path.resolve(packageRoot, 'src', 'storefront');

  // `import.meta.resolve` (not `npx`) to find the CLI entry — in an
  // npm-workspaces monorepo `@react-router/dev` may be hoisted to the repo
  // root or kept nested next to this package depending on version
  // resolution, and `npx` was found to mis-detect the storefront's app
  // directory when invoked this way (root-detection false negative:
  // "Could not find a root route module" despite app/root.tsx existing —
  // reproducible even with a correct `cwd`). Resolving and invoking the bin
  // script directly with Node sidesteps whatever npx does differently.
  const devPackageJsonUrl = import.meta.resolve('@react-router/dev/package.json');
  const devPackageDir = path.dirname(fileURLToPath(devPackageJsonUrl));
  const cliBin = path.resolve(devPackageDir, 'bin.js');

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliBin, 'build'], {
      cwd: storefrontRoot,
      stdio: 'inherit'
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Storefront build failed with exit code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

process.on('uncaughtException', function (exception) {
  import('../../lib/log/logger.js').then((module) => {
    module.error(exception);
  });
});
process.on('unhandledRejection', (reason, p) => {
  import('../../lib/log/logger.js').then((module) => {
    module.error(`Unhandled Rejection: ${reason} at: ${p}`);
  });
});

build();
