# Load testing

One scenario, `scenarios/interference.js`, run with [k6](https://k6.io)
(`brew install k6`).

## What it measures, and why it isn't RPS

The interesting question about a storefront under load is not its peak
throughput. It is whether the people who have to *operate* the store can still
do so while it is busy:

> while shoppers are hammering the store, can the merchant still open the admin
> panel, and can the operator still reach the control plane?

So the headline number is a **degradation ratio**, not a rate. Three probes —
admin panel, hub API, storefront — run at a fixed 1 req/s for the whole test,
including a quiet period before and after the flood. Each is therefore sampled
under both conditions, on the same machine, minutes apart. The result is the
ratio of the two p95s.

That framing matters because of where these runs happen. On one laptop the
load generator, the app, Postgres and Redis all compete for the same cores, so
the absolute latencies are inflated by contention a real deployment would not
have. A *ratio of two measurements taken under identical host conditions*
survives that; an absolute p95 does not.

## Running it

```bash
k6 run tests/load/scenarios/interference.js \
  -e STORE_URL=http://localhost:10002 \
  -e HUB_URL=http://localhost:8000 \
  -e HUB_TOKEN="$(cat /path/to/token)" \
  -e CATEGORY_KEY=kids \
  -e PRODUCT_KEY=ceramic-coffee-cup-white
```

Tunables: `PEAK_VUS` (default 100), `FLOOD_SECONDS` (120), `QUIET_SECONDS`
(45). `STORE_URL` should point at a **deployed instance** (a production build),
not the dev server — the dev server compiles on demand and you would be
measuring webpack.

## Reading the result

```
=== Degradation under storefront load ===
target        quiet p95    under load    degradation
admin panel   ...ms        ...ms         ...x
hub API       ...ms        ...ms         ...x
storefront    ...ms        ...ms         ...x
```

Thresholds that fail the run:

| gate | value | why |
|---|---|---|
| `probe_admin_available` | > 99% | a slow admin panel is tolerable; an unreachable one is not |
| `probe_admin_flood` p95 | < 2000 ms | the merchant can still work |
| `probe_hub_flood` p95 | < 500 ms | the control plane is a separate process and should be nearly immune — if it isn't, suspect Docker socket or host CPU contention rather than the app |
| storefront p95 | < 800 ms | service level under load |
| `http_req_failed` | < 1% | errors, not just slowness |
| `dropped_iterations` | 0 | **the generator kept up** |

`dropped_iterations` is the one to check first. Any non-zero value means k6
itself could not sustain the requested rate, so the app was never the
bottleneck and **none of the other numbers mean anything**.

## The 1000-user question

1000 concurrent users is not measurable from the same machine that hosts the
containers, and pretending otherwise produces a confident wrong number. Past a
few hundred VUs you are measuring the generator starving, which is exactly what
`dropped_iterations` is there to detect.

What *is* measurable locally:

- **the shape of the curve** — ramp `PEAK_VUS` (50 → 100 → 200 → 400) and find
  the knee where storefront p95 crosses 800 ms;
- **the degradation ratios**, for the reason given above.

For the absolute number, run the same script unchanged from a second machine on
the LAN with `-e STORE_URL=http://<host>:<port>` and a higher `PEAK_VUS`. The
generator then contends with nothing. Before any large run, check the app's
Postgres `max_connections` (default 100) and the app's pool size — that wall is
usually hit well before CPU.

Container CPU/memory during a run comes from the hub's existing SSE stats
stream (`GET /api/instances/{id}/stats/stream`), so no extra instrumentation is
needed; correlate its timeline against k6's output.
