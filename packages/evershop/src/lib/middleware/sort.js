import Topo from '@hapi/topo';

/**
 * This function take a path and scan for the middleware functions
 *
 * @param {array} middlewares  The list of middleware functions
 *
 * @return {array} List of sorted middleware functions
 */
export function sortMiddlewares(middlewares = []) {
  // O(1) dependency-existence checks instead of an `Array.findIndex` scan
  // per dependency inside a `.forEach` inside a `.filter` (was O(n^2) for n
  // middlewares). This function runs on every request (its caller's cache
  // is dev-mode-disabled), so the quadratic cost showed up as measurable
  // per-request latency, not just a one-time build cost.
  const byId = new Map();
  for (const m of middlewares) {
    const bucket = byId.get(m.id);
    if (bucket) bucket.push(m);
    else byId.set(m.id, [m]);
  }
  const dependencyExists = (d, m) =>
    (byId.get(d) || []).some(
      (e) =>
        e.scope === 'app' ||
        e.scope === 'admin' ||
        e.scope === 'frontStore' ||
        e.routeId === null ||
        e.routeId === m.scope ||
        e.routeId === m.routeId
    );

  const middlewareFunctions = middlewares.filter((m) => {
    if ((m.before === m.after) === null) return true;
    const dependencies = (m.before || []).concat(m.after || []);
    let flag = true;
    dependencies.forEach((d) => {
      if (flag === false || !dependencyExists(d, m)) {
        flag = false;
      }
    });

    return flag;
  });
  const sorter = new Topo.Sorter();
  middlewareFunctions.forEach((m) => {
    sorter.add(m.id, { before: m.before, after: m.after, group: m.id });
  });

  // Same O(1)-lookup swap for the final ordering pass — was `findIndex` +
  // `splice` per node (another O(n^2)).
  const queueById = new Map();
  for (const m of middlewareFunctions) {
    const bucket = queueById.get(m.id);
    if (bucket) bucket.push(m);
    else queueById.set(m.id, [m]);
  }
  return sorter.nodes.map((n) => queueById.get(n).shift());
}
