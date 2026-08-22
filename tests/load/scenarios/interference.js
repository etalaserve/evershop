/**
 * Storefront load test with a concurrent admin/control-plane probe.
 *
 * The question this answers is not "how many requests per second can the
 * storefront serve" — that number is barely meaningful when the load
 * generator, the app, Postgres and Redis all share one laptop. It is:
 *
 *     while shoppers are hammering the store, can the merchant still open
 *     the admin panel, and can the operator still reach the control plane?
 *
 * That is measured as a ratio rather than an absolute. Three probes run at a
 * fixed low rate for the entire test, including a quiet period before and
 * after the flood, so each one is sampled under both conditions on the same
 * machine within the same minute. The ratio of the two p95s is the result,
 * and it stays valid even when absolute latency is inflated by contention
 * that a real deployment would not have.
 *
 * Run:
 *   k6 run tests/load/scenarios/interference.js \
 *     -e STORE_URL=http://localhost:10002 \
 *     -e HUB_URL=http://localhost:8000 \
 *     -e HUB_TOKEN=...
 *
 * VUS/DURATION are overridable so the same script serves both the local
 * shape-finding run and a real one driven from a separate host.
 */
import http from 'k6/http';
import exec from 'k6/execution';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const STORE = __ENV.STORE_URL || 'http://localhost:10002';
const HUB = __ENV.HUB_URL || 'http://localhost:8000';
const HUB_TOKEN = __ENV.HUB_TOKEN || '';

const PEAK_VUS = Number(__ENV.PEAK_VUS || 100);
const FLOOD_SECONDS = Number(__ENV.FLOOD_SECONDS || 120);
const QUIET_SECONDS = Number(__ENV.QUIET_SECONDS || 45);

/**
 * Probe latency is split into quiet vs flood by tagging, so the ratio can be
 * computed from a single run. k6 cannot compare two windows of the same
 * metric on its own, hence one Trend per (probe, phase).
 */
const adminQuiet = new Trend('probe_admin_quiet', true);
const adminFlood = new Trend('probe_admin_flood', true);
const hubQuiet = new Trend('probe_hub_quiet', true);
const hubFlood = new Trend('probe_hub_flood', true);
const storeQuiet = new Trend('probe_store_quiet', true);
const storeFlood = new Trend('probe_store_flood', true);

const adminUp = new Rate('probe_admin_available');
const hubUp = new Rate('probe_hub_available');

const floodStart = QUIET_SECONDS;
const floodEnd = QUIET_SECONDS + FLOOD_SECONDS;

/**
 * Which phase the run is in right now.
 *
 * Uses k6's own run clock rather than a module-scope Date.now(): the init
 * context is evaluated once per VU, so a locally captured start time would
 * differ per VU and drift as VUs are ramped in — putting probes in the wrong
 * bucket exactly when the ramp matters most.
 */
function phase() {
  const t = exec.instance.currentTestRunDuration / 1000;
  return t >= floodStart && t < floodEnd ? 'flood' : 'quiet';
}

export const options = {
  scenarios: {
    // The load itself: a browse funnel, ramped so the knee is visible
    // rather than a single fixed rate.
    storefront_flood: {
      executor: 'ramping-vus',
      exec: 'storefrontFunnel',
      startVUs: 0,
      stages: [
        { duration: `${QUIET_SECONDS}s`, target: 0 },
        { duration: '30s', target: Math.round(PEAK_VUS / 4) },
        { duration: '30s', target: Math.round(PEAK_VUS / 2) },
        { duration: `${Math.max(FLOOD_SECONDS - 90, 30)}s`, target: PEAK_VUS },
        { duration: '30s', target: 0 },
        { duration: `${QUIET_SECONDS}s`, target: 0 }
      ],
      gracefulRampDown: '10s'
    },

    // The probes. constant-arrival-rate, not constant-vus: a probe must keep
    // its 1/s cadence even when responses slow down, or it would silently
    // sample less often exactly when the system is worst.
    admin_probe: {
      executor: 'constant-arrival-rate',
      exec: 'adminProbe',
      rate: 1,
      timeUnit: '1s',
      duration: `${floodEnd + QUIET_SECONDS}s`,
      preAllocatedVUs: 5,
      maxVUs: 20
    },
    hub_probe: {
      executor: 'constant-arrival-rate',
      exec: 'hubProbe',
      rate: 1,
      timeUnit: '1s',
      duration: `${floodEnd + QUIET_SECONDS}s`,
      preAllocatedVUs: 3,
      maxVUs: 10
    },
    storefront_probe: {
      executor: 'constant-arrival-rate',
      exec: 'storefrontProbe',
      rate: 1,
      timeUnit: '1s',
      duration: `${floodEnd + QUIET_SECONDS}s`,
      preAllocatedVUs: 3,
      maxVUs: 10
    }
  },

  thresholds: {
    // The headline gate. An admin panel that is merely slow is tolerable;
    // one that is unreachable is not.
    probe_admin_available: ['rate>0.99'],
    probe_admin_flood: ['p(95)<2000'],

    // The control plane is a separate process and should be nearly immune.
    // If it isn't, that points at Docker socket or host CPU contention
    // rather than anything in the app.
    probe_hub_flood: ['p(95)<500'],

    // Storefront service level under load.
    'http_req_duration{scenario:storefront_flood}': ['p(95)<800'],
    'http_req_failed{scenario:storefront_flood}': ['rate<0.01'],

    // A non-zero value means the generator, not the app, was the
    // bottleneck — the run is invalid and the numbers must not be quoted.
    dropped_iterations: ['count==0']
  }
};

export function storefrontFunnel() {
  // A shopper's path, not a single URL: home -> category -> product. This is
  // what exercises SSR, GraphQL, Postgres and the Redis cache together.
  const home = http.get(`${STORE}/`, { tags: { step: 'home' } });
  check(home, { 'home 200': (r) => r.status === 200 });
  sleep(0.5);

  const cat = http.get(`${STORE}/category/${__ENV.CATEGORY_KEY || 'kids'}`, {
    tags: { step: 'category' }
  });
  check(cat, { 'category 200': (r) => r.status === 200 });
  sleep(0.5);

  const product = http.get(
    `${STORE}/product/${__ENV.PRODUCT_KEY || 'ceramic-coffee-cup-white'}`,
    { tags: { step: 'product' } }
  );
  check(product, { 'product 200': (r) => r.status === 200 });
  sleep(1);
}

export function adminProbe() {
  const res = http.get(`${STORE}/admin/login`, {
    tags: { probe: 'admin' },
    timeout: '30s'
  });
  const ok = res.status === 200;
  adminUp.add(ok);
  (phase() === 'flood' ? adminFlood : adminQuiet).add(res.timings.duration);
}

export function hubProbe() {
  const params = {
    tags: { probe: 'hub' },
    timeout: '30s',
    headers: HUB_TOKEN ? { Authorization: `Bearer ${HUB_TOKEN}` } : {}
  };
  const res = http.get(`${HUB}/api/instances`, params);
  const ok = res.status === 200;
  hubUp.add(ok);
  (phase() === 'flood' ? hubFlood : hubQuiet).add(res.timings.duration);
}

export function storefrontProbe() {
  const res = http.get(`${STORE}/`, { tags: { probe: 'store' }, timeout: '30s' });
  (phase() === 'flood' ? storeFlood : storeQuiet).add(res.timings.duration);
}

/**
 * The summary is the deliverable. k6's default output shows six unrelated
 * trends; what matters is each probe's quiet-vs-flood ratio side by side.
 */
export function handleSummary(data) {
  const p95 = (name) => data.metrics[name]?.values?.['p(95)'] ?? null;
  const ratio = (a, b) => {
    const x = p95(a);
    const y = p95(b);
    return x && y ? y / x : null;
  };

  const rows = [
    ['admin panel', 'probe_admin_quiet', 'probe_admin_flood'],
    ['hub API', 'probe_hub_quiet', 'probe_hub_flood'],
    ['storefront', 'probe_store_quiet', 'probe_store_flood']
  ].map(([label, q, f]) => ({
    label,
    quiet_p95_ms: p95(q),
    flood_p95_ms: p95(f),
    degradation_x: ratio(q, f)
  }));

  const fmt = (n) => (n === null ? 'n/a' : n.toFixed(0));
  const fmtx = (n) => (n === null ? 'n/a' : `${n.toFixed(2)}x`);

  let text = '\n=== Degradation under storefront load ===\n';
  text += 'target        quiet p95    under load    degradation\n';
  for (const r of rows) {
    text += `${r.label.padEnd(14)}${(fmt(r.quiet_p95_ms) + 'ms').padEnd(13)}${(fmt(r.flood_p95_ms) + 'ms').padEnd(14)}${fmtx(r.degradation_x)}\n`;
  }
  text += `\nadmin availability : ${((data.metrics.probe_admin_available?.values?.rate ?? 0) * 100).toFixed(2)}%\n`;
  text += `storefront p95     : ${fmt(p95('http_req_duration'))}ms\n`;
  text += `requests failed    : ${((data.metrics.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2)}%\n`;
  const dropped = data.metrics.dropped_iterations?.values?.count ?? 0;
  text += `dropped iterations : ${dropped}${dropped ? '  <-- GENERATOR SATURATED, run is invalid' : ''}\n`;

  return {
    stdout: text,
    'summary.json': JSON.stringify({ rows, metrics: data.metrics }, null, 2)
  };
}
