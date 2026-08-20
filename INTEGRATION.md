# Integration Notes: EverShop as a Multi-Tenant SaaS Template

This document captures a review of the EverShop core repo (`packages/evershop/src`) done to evaluate it as the **per-tenant site template** for a larger ecommerce builder product, plus a reference design for the **higher-level SaaS orchestrator project** that would deploy and manage many instances of this template.

Scope split:
- **This repo** stays single-tenant per deployed instance — one `.env`, one Postgres DB, one store. It is the thing that gets provisioned, not the thing that provisions.
- **The orchestrator** is a separate project (not built here) responsible for provisioning, deploying, and managing many tenant instances of this repo.

Stack recap: Node.js ≥ 20, Express, React 18 with SSR + hydration (MPA, not SPA — no client-side router, each route gets its own bundle and a full HTML response), webpack 5 + SWC, PostgreSQL 13+, GraphQL schema assembled at startup, Tailwind v4, `react-hook-form`.

---

## 1. Findings

### 1.1 What's genuinely good

- **Visual page builder is real and well-built.** `modules/pageBuilder` ([packages/evershop/src/modules/pageBuilder](packages/evershop/src/modules/pageBuilder)) has drag-and-drop widget placement (`@dnd-kit`), changesets with undo/redo, a publish workflow, and scheduled "rollout plans" that swap content live at a given time — all DB-driven, no redeploy needed for content changes. `publishChangeset.ts` writes directly to Postgres in a transaction.
- **Merchant-facing widget configuration** (the drawer UI to place/configure/reorder registered widgets) is genuinely usable by non-developers, once widget types exist.
- **i18n is real**: dictionaries, locale resolution, multi-language support (`lib/locale/`) — not stubbed.
- **File storage is abstracted** (`modules/cms/services/storage/`) with a working S3 backend (`@aws-sdk/client-s3`) alongside local disk.
- **Migrations are clean and versioned** per-module (`<module>/migration/Version-X.Y.Z.ts`), tracked in a `migration` DB table, with a working seed-data CLI (`evershop seed --all`).
- **A Docker path already exists** — root `docker-compose.yml` + published `evershop/evershop` image is the documented "one command" install today.

### 1.2 Install / deploy story

- Install is **CLI-only**: `evershop install` → `packages/evershop/src/bin/install/index.js`. Interactive `enquirer` prompts for DB creds and admin account, but every prompt already has an env-var override (`DB_HOST`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, etc.), so **non-interactive install is already possible** — just not exposed as a web UI.
- Writes a plain `.env` at repo root, creates `media/`/`public/` dirs, creates `admin_user` table, inserts the admin row, runs `migrate()` for all core modules.
- Other CLI commands: `evershop user:create`, `evershop seed`, `evershop theme:*`, `evershop build`, `evershop start`, `evershop dev`.
- Config is otherwise handled via `node-config` (`getConfig()`), covering `shop`, `system` (storage, sessions, notification emails, payment), `catalog`, `checkout`, `pricing`, `themeConfig`, `oms`, `sitemap` — this is separate from the `.env` DB/admin credentials.
- **No multi-tenant concept anywhere** in the codebase — confirms the orchestrator must live outside this repo.
- CI: `.github/workflows/build_test.yml` (PR test matrix, Node 20/22), `.github/workflows/release.yml` (npm publish + Docker Hub push).

### 1.3 Theming & extensibility

- **Themes are developer artifacts.** Switching a whole theme is CLI-driven (`evershop theme active`, `theme create`, `theme export-content`) and requires a compiled `dist/` — a build step, not an upload-and-go swap. `theme create` scaffolds a starter `Homepage.tsx` authored in React/TSX.
- **Widgets are flexible for devs, not for merchants to create new ones.** `registerWidget()` (`lib/widget/widgetManager.ts`) requires file paths to React components plus an AJV settings schema, registered only from a module's `bootstrap.ts`; the registry freezes after bootstrap (mutation from request handlers throws).
- **Extensions are code-level only** — no plugin marketplace, no zip-upload, no admin toggle. `extensions/` at the project root holds TypeScript modules with their own `bootstrap.ts`.
- **Bottom line**: EverShop has a strong runtime content editor (page builder) but themes/widget *types* still require code + rebuild. The gap between "developer platform with a nice builder" and "merchant picks a template and drags in any block" is real.

### 1.4 Ops maturity

- **Tests**: 135 test files, almost entirely unit tests. Only one integration test found (`modules/catalog/tests/intergration/productView.test.js`), no e2e.
- **Security**:
  - Cookie secret **defaults to the literal string `'keyboard cat'`** if unset ([modules/auth/services/getCookieSecret.ts:4](packages/evershop/src/modules/auth/services/getCookieSecret.ts)) — must never reach a provisioned tenant.
  - Rate limiting exists (`modules/base/services/rateLimit.ts`) — tiered limits on page/api/auth routes.
  - **No CSRF middleware found.**
  - SQL injection defended against via query builder throughout; manual escaping noted where needed.
  - Sessions are Postgres-backed via `connect-pg-simple`.
- **Payments**: only COD, PayPal, Stripe ship out of the box.
- **Email**: abstracted (`registerEmailService()` in `lib/mail/emailHelper.ts`) but **nothing wires a concrete provider by default** — order confirmation / password reset emails throw until an operator registers one.
- **Search**: Postgres full-text search only (`websearch_to_tsquery`) — no Elasticsearch/Algolia/Meilisearch.
- **Caching**: **none.** No Redis/memcached anywhere; only in-process memoization for settings lookups and a static-asset `Cache-Control` header. In-process memoization breaks down once multiple replicas exist.
- **i18n**: real multi-language support, but **effectively single-currency** — `getStoreCurrency()` returns one configured ISO code, no exchange-rate/multi-currency layer.

### 1.5 Core strategic gap

EverShop already solved the hard part (a real drag-and-drop content editor with scheduled publishing). What's missing is the **no-code onboarding path**: going from "clone a repo, run a CLI installer, write TypeScript to add a widget/theme" to "click deploy, get a live store, pick a template visually." Closing that needs: (a) a non-interactive/web install flow with safe secret defaults, (b) a curated set of pre-built themes + a wider widget library so most merchants never touch code, and (c) the multi-tenant orchestration layer described below.

---

## 2. This repo: near-term hardening (Postgres formalized + Redis added)

Postgres is already a hard dependency ([lib/postgres/connection.ts](packages/evershop/src/lib/postgres/connection.ts)). The concrete gap is **no caching/shared-state layer**, which matters once a tenant instance runs behind a load balancer with multiple replicas (as it will under the orchestrator described in §3).

Planned additions:

- **Sessions**: add Redis as a session store option (`connect-redis`) alongside the existing `connect-pg-simple` — avoids putting session write load on the primary tenant DB on every request, and works correctly across replicas (Postgres-backed sessions do too, but Redis is cheaper per-request).
- **App-level caching**: a thin cache-provider abstraction mirroring the existing `registerEmailService()` pattern in `lib/mail/emailHelper.ts`, used first for settings lookups (`modules/setting/services/setting.ts:133`, currently in-process-memoized only — which is wrong once there's more than one instance of the process).
- **Config**: extend the `node-config` shape with a `system.cache`/`system.redis` block, plus `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` env vars alongside the existing `DB_*` vars in both the installer and `docker-compose.yml`.
- **Docker**: add a `redis` service to root `docker-compose.yml` and `docker/Dockerfile` for local parity with what the orchestrator will provide in production.

Security prerequisites carried forward from §1.4, since any template that gets cloned per-tenant needs these closed first:

- Fix the `'keyboard cat'` fallback in `getCookieSecret.ts` — require a configured secret, or generate and persist a strong random one at install time; never silently fall back to a known value.
- Add CSRF middleware.

Key files: [bin/install/index.js](packages/evershop/src/bin/install/index.js), [modules/auth/services/getSessionConfig.ts](packages/evershop/src/modules/auth/services/getSessionConfig.ts) / `getCookieSecret.ts`, [lib/mail/emailHelper.ts](packages/evershop/src/lib/mail/emailHelper.ts) (pattern to mirror), [modules/setting/services/setting.ts](packages/evershop/src/modules/setting/services/setting.ts), root `docker-compose.yml` / `docker/Dockerfile`.

---

## 3. Reference design: the higher-level SaaS orchestrator project

A separate project/repo, responsible for provisioning and managing many instances of this EverShop template. Not built as part of this task — documented here as the target architecture the "seam" in §2 (non-interactive `evershop install`) needs to support.

| Concern | Choice | Why |
|---|---|---|
| **Framework** | Node.js/TypeScript control plane — an API server (Express, matching this repo's own choice) for tenant-provisioning APIs, plus a background worker for async provisioning jobs (DB creation, first-boot install, DNS/subdomain wiring) | One language across both layers; API/worker split keeps slow provisioning work off the request path |
| **Database** | Postgres for the orchestrator's own control-plane data (tenants, plans, billing, provisioning status), separate instance/cluster from any tenant DB. Each tenant gets its own Postgres database (or schema, if pooling density matters) provisioned at signup | Matches this repo's single-tenant-per-instance design; keeps tenant data physically isolated |
| **Cache / queue** | Redis, doing double duty as the job queue (e.g. BullMQ) for provisioning workflows and as shared cache for the control plane | Same technology the tenant template now depends on (§2); one operational surface to run |
| **Middleware / orchestration** | Containerized tenant instances (Docker — this repo already ships a production Dockerfile), one container (or small pool) per tenant. Target infra (k8s namespaces, Fly.io machines, ECS tasks, etc.) is an infra decision, not prescribed here. A reverse proxy/router (Traefik, Caddy, or cloud LB) in front, mapping tenant subdomains → tenant container | Reuses the existing Docker artifact instead of inventing a new deploy unit |
| **Security** | Control-plane auth (operator/admin accounts) kept separate from each tenant's own EverShop admin auth. Secrets (DB creds, cookie secrets, Redis creds) generated per-tenant at provisioning time and injected as env vars — never shared or defaulted, directly closing the `'keyboard cat'` gap from §1.4/§2. TLS terminated at the router layer per-tenant subdomain/custom-domain | Blast-radius isolation between tenants and between control plane and tenants |
| **Provisioning flow** | Orchestrator calls into this repo's `evershop install` in fully non-interactive mode (env-var driven) to bring up each new tenant | This is the seam between the two projects — §2's installer hardening is what makes this flow safe |

### Open infra decisions (left to the orchestrator project)

- Container orchestration target (Kubernetes vs. a PaaS like Fly.io/Railway vs. plain ECS) — affects how "one container per tenant" is scheduled and scaled.
- Whether tenant databases are one-database-per-tenant or schema-per-tenant within a shared Postgres cluster — affects backup/restore granularity and noisy-neighbor risk.
- Billing/metering integration — not addressed here at all.

---

## 4. Suggested sequencing

1. **This repo**: cookie-secret fix + CSRF middleware (small, high-value security fixes, no new infra).
2. **This repo**: Redis addition (sessions + settings cache) + Docker Compose/Dockerfile updates.
3. **This repo**: confirm/finish non-interactive install coverage (audit every prompt in `bin/install/index.js` for an env-var override) — this is the exact seam the orchestrator will call into.
4. **Orchestrator project**: scaffold control plane per §3, starting with the provisioning API + worker calling into (3).
