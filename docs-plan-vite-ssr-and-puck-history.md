# EverShop In-Process Vite SSR Rewrite (Storefront + Admin)

## Context

EverShop today is a single Express + PostgreSQL + GraphQL monolith. Admin (`/admin/*`) and the storefront (everything else) currently share the exact same rendering machinery — `Area.tsx` (widget-slot composition), `render.ts`/`Server.tsx` (React 18 `renderToString` SSR), `Hydrate*.tsx` (client hydration), `buildEntry.js` (generated per-route entry bundles), and per-context Webpack configs — differentiated only by an `isAdmin` flag, not forked code paths. Storefront dev mode today has **no SSR at all** (empty shell + full CSR); production SSR is synchronous `renderToString`, no streaming.

**Scope history, so the "why" is traceable:**
1. A prior session started rewriting the storefront as a *separate standalone service* (own port, own Dockerfile, headless HTTP client to EverShop). Uncommitted, later found to be architecturally the wrong shape.
2. The plan was corrected to rewrite the storefront **in-process** — one container, one port, `/graphql` (verified path — not `/api/graphql`) same-origin — with `/admin/*` explicitly left untouched forever on the legacy pipeline. **This phase (Phase 0: infra scaffolding) is implemented and verified working** — see "Storefront: what's already done" below.
3. **The user has now expanded the scope again**: not two rendering pipelines coexisting even temporarily-by-design for admin, but one unified React Router v7 + Vite SSR app serving *everything* — admin included. The site builder (widget drag-and-drop page-builder) must keep working throughout.

Two follow-up investigations (admin page inventory + page-builder deep dive) and two clarifying decisions from the user shape the rest of this plan:
- Admin is **410 files (~36K lines)** across **54 routes in 15 modules**, plus **~28K lines** of shared/admin-only React components, plus a **~15K-line** page-builder feature. A full 1:1 port is a genuinely large, multi-phase effort — **paced incrementally, module by module, same pattern as the storefront migration** (user's explicit choice over doing it all at once).
- The page-builder's live preview loads the storefront page inside an `<iframe>` and talks to it over `postMessage` — it does not care which framework renders that iframe's content, only that the DOM/data-attributes match. So the **storefront-side bridge components must move with the storefront migration now** (already in flight), but the **admin-side editor page (`/admin/page-builder/edit/:routeId`, ~6,036 lines) is explicitly deferred** — it keeps working unmodified against the legacy admin renderer until the rest of admin's simpler CRUD surface is migrated first (user's explicit choice).

---

## Storefront: what's already done (Phase 0, verified working)

- `packages/storefront` (standalone app) moved into `packages/evershop/src/storefront/`, folded into the single `@evershop/evershop` package — one `evershop:latest` image, one `npm install && npm run build`.
- `src/bin/lib/createStorefrontMiddleware.ts` mounts React Router v7 via `@react-router/express`: Vite middleware-mode dev server (real SSR in dev now — closes a real gap, the legacy pipeline has none in dev) for dev, compiled `build/server/index.js` for prod.
- Mounted in `src/bin/lib/app.js` right after the existing middleware chain (session/locale/route-matching all still run first), gated by a path predicate (`isMigratedStorefrontPath` in `createStorefrontMiddleware.ts`) that starts empty and grows as routes cut over. A request that doesn't match falls through to the legacy pipeline untouched.
- Build pipeline: `src/bin/build/index.js` now also runs `react-router build` (resolved via `import.meta.resolve('@react-router/dev/package.json')`, not `npx` — `npx` was found to mis-detect the app root). Dev file-watcher (`src/bin/dev/enableWatcher.js`, `src/bin/lib/watch/watchHandler.ts`) excludes `src/storefront/**` so it doesn't try to mirror-compile Vite's own `.react-router` cache directory into `dist/`.
- Same-origin cleanup done: dropped `window.ENV`/`EVERSHOP_BASE_URL` cross-origin plumbing, `imageUrl()` is now a plain passthrough, GraphQL client hits `http://127.0.0.1:${PORT}/graphql` server-side and `/graphql` directly client-side.
- **Verified**: dev-mode real SSR (smoke-tested with a throwaway route, removed after confirming), `npm run build` succeeds (both legacy Webpack build and new Vite build), `npm run start` boots the compiled bundle cleanly, and — critically — with the gate empty, admin and every existing storefront page behave byte-identically to before (200/302 as expected, no regressions).

Everything below in the **Storefront** sections (widget shim, payment methods, cart/session, cutover phases 1–4) was already planned and is unchanged in approach — only the widget shim gets one addition (the page-builder bridge components, below). This section is not being re-litigated, just carried forward.

## Storefront: widget rendering shim (updated — now includes the page-builder bridge)

23 widget types are registered across 3 modules' `bootstrap.ts` (`catalog`: `related_products`, `frequently_bought_together`, `upsell_products`, `cart_frequently_bought_together`, `collection_products`, `collection_stack`, `collection_spotlight`, `product_hero`; `blog`: `featured_blogs`; `cms`: `columns`, `text_block`, `basic_menu`, `footer_menu`, `banner`, `simple_slider`, `brand_story`, `category_mosaic`, `tiered_categories`, `bento_grid`, `separator`, `section`, `split_feature`, `announcement_bar`, `coupon_block`, `faq_block`, `trust_strip`).

- `src/storefront/app/lib/widgets/registry.tsx` — `Record<string, React.ComponentType<{ widget: WidgetFragment }>>` keyed by `type`, one hand-ported entry per type, reusing existing storefront primitives where data shapes overlap.
- `src/storefront/app/components/widgets/WidgetArea.tsx` — the `Area.tsx` equivalent: given `areaId` + route id + a pre-fetched widget list (one `widgetsForRoute` call per page load), filters/sorts, looks up `widget.type` in the registry, renders nothing (not a crash) for unregistered types, recurses into `columns` for container types.
- **New, required for the site builder to keep working**: port `components/common/page-builder/{WidgetChrome.tsx,AreaDropZone.tsx,PageBuilderBridge.tsx,pageBuilderMode.ts,dropSortOrder.ts}` (~4,464 lines total) into `src/storefront/app/lib/page-builder/`. These are storefront-side and framework-agnostic in behavior (native HTML5 drag-and-drop + `postMessage`, no dependency on the legacy Area/Webpack internals beyond reading/writing the same `data-evershop-pb-*` DOM attributes), so this is a port of behavior, not a redesign:
  - `WidgetArea.tsx` must render the same `data-evershop-pb-widget-uid` / `data-evershop-pb-sort-order` / `data-evershop-global` attributes the current `Area.tsx` does, in the same DOM order, or the admin editor's move-up/down math and Layers-panel paint-order sync break.
  - `?changeset=<token>` must be detected server-side (loader reads the query param) and passed to `widgetsForRoute(route, changeset, entityUrn)` so preview mode overlays draft ops instead of published-only state (mirrors `applyOverlayToWidgets.ts` on the legacy side — this overlay logic itself stays server-side/unchanged, only the *caller* is new).
  - The AJAX JSON refetch the editor uses for `data-update` pushes (`fetch(url, {headers:{Accept:'application/json'}})` returning `eContext`-shaped JSON) needs an equivalent — a resource route or a `?_data` style response returning `{graphqlResponse, propsMap, widgets}` shaped the same way `PageBuilderBridge.tsx`'s `pushPreviewToIframe()` expects, including the monotonic `sequence` number it already sends and expects echoed.
  - `pageBuilderMode.ts`'s iframe-detection guard (`window.parent !== window` AND `?changeset=` present) and the `window.__EVERSHOP_PAGE_BUILDER__` flag port as-is — pure client-side logic, no framework dependency.
- Extension point: `registerStorefrontWidget(type, component)`, documented alongside `registerWidget()` in `lib/widget/widgetManager.ts`.

*(Payment methods, cart/session `sid` decision, GraphQL data layer, theme system, and the Phase 1–4 storefront cutover sequencing are unchanged from before — see "Files to create/modify/delete" and "Verification" at the end for the consolidated list.)*

---

## Admin migration (new scope)

### Route pattern — repeats, doesn't need per-route bespoke design

Admin routes overwhelmingly follow one of two shapes, confirmed across all 15 modules:
- **CRUD triplet**: `<entity>Grid` (list/data-grid), `<entity>Edit` + `<entity>New` (usually sharing one Form component). E.g. `catalog`'s `/products`, `/products/new`, `/products/edit/:id`; same shape for categories, collections, attributes, customers, blog posts/categories/tags, CMS pages, coupons, landing pages.
- **Settings/dashboard pages**: single-route pages with a form or read-only view (`/setting/store`, `/setting/tax`, `/setting/shipping`, the `cms` dashboard with oms/recharts widgets injected via Area).

This means the migration work is dominated by *repeating a pattern* (grid loader + paginated GraphQL query + table; edit loader + mutation + form), not 54 bespoke designs. Plan the effort as: build the grid pattern and the form pattern once each (as shared helpers in `src/storefront/app/lib/admin/`), then apply module by module.

### File layout — same RR7 app, admin routes prefixed

Admin routes live in the **same** `src/storefront/app/routes/` tree as storefront routes (this *is* the "one web app" the user asked for — not a second Vite root, not a second Express mount). React Router v7's flat-routes convention makes this natural: `admin.products.tsx`, `admin.products.edit.$id.tsx`, `admin.products.new.tsx`, etc. — the `admin.` prefix produces the `/admin/*` URL segment for free and keeps admin routes visually grouped in the routes folder.

```
src/storefront/app/routes/
  admin.tsx                   # layout route: session guard + admin shell (nav/header)
  admin._index.tsx            # /admin — dashboard
  admin.products.tsx          # /admin/products — grid
  admin.products.edit.$id.tsx # /admin/products/edit/:id
  admin.products.new.tsx      # /admin/products/new
  ...
  (existing storefront routes, unchanged)
```

### Session, auth, and GraphQL — parallel to storefront's, different cookie/schema

- **Cookie**: `asid` (`getAdminSessionCookieName()`), not `sid`. Same underlying mechanism as the storefront's session read (`connect-pg-simple` storage lookup keyed by the signed cookie value) — the storefront migration already established this pattern for `sid`; admin loaders use the same technique with the admin cookie name.
- **GraphQL endpoint**: `POST /api/admin/graphql` — **confirmed via this investigation**, correcting an earlier assumption of `/admin/graphql`. Uses `adminSchema` (`buildSchema.js`'s default export, built with `.admin.graphql` extensions included — 41 admin-only extension files layered over 78 shared core types).
- **Auth guard**: `admin.tsx` (the layout route wrapping every `/admin/*` page) is where the session check lives — a loader that verifies the `asid` session resolves to a valid admin user (mirroring `[context]isAdmin[auth].js`'s check) and redirects to `/admin/login` if not. Verify at implementation time whether a lightweight "who am I" query already exists on `adminSchema` to check against, or add one (small, admin-only extension, same pattern as the `headless` module).
- **Login page**: `/admin/login` itself is one of the earliest routes to migrate (nothing else works without it) — port `modules/auth/pages/admin/adminLogin/LoginForm.tsx` and the `adminLoginJson` POST handler's client call.

### Shared component library — mostly reusable, not a rewrite

`src/components/common/**` (~23,515 lines: shadcn/radix-style primitives under `ui/` — Dialog, Sheet, Sidebar, Table, Tabs, DropdownMenu, Select, Popover, toasts via Sonner — plus form fields, the `Editor.tsx` block editor, metafield UI) is consumed by *both* admin and storefront today and is already Tailwind/shadcn-based, meaning most of it should port with light adaptation (swap `Area`-based composition for plain component composition/props) rather than a from-scratch rebuild. `src/components/admin/**` (~4,929 lines: `ImageUploader.tsx` with `@dnd-kit` reorder, `FileBrowser.tsx`, category/product/collection selectors, the grid support kit) is admin-specific and smaller — port these directly into `src/storefront/app/components/admin/`.

### Phase sequencing (incremental, same principle as storefront: simple/low-risk first, complex/high-risk last)

1. **Admin Phase 0 — infra**: extend the existing gate (`isMigratedStorefrontPath` → generalize to `isMigratedPath`, since it now covers both trees) to recognize `/admin/*` prefixes too; build the grid-pattern and form-pattern shared loaders/components; migrate `/admin/login` (nothing else is reachable without it, and it validates the `asid` session/GraphQL pattern end-to-end on the smallest possible surface).
2. **Admin Phase 1 — small, self-contained modules**: `customer` (grid + edit, 14 files), `setting` (store/system/tax/shipping forms, no grids), `checkout`'s shipping settings. Low risk, proves the CRUD pattern holds across a few real modules before tackling the big ones.
3. **Admin Phase 2 — the CRUD-heavy modules**: `catalog` (97 files — biggest single module, includes the tabbed product-edit form and category tree), `blog` (57 files), `cms` minus dashboard/page-builder (55 files, mostly CMS pages CRUD + the widget-instance grid), `promotion` (53 files).
4. **Admin Phase 3 — oms + dashboard + payment-module admin fragments**: order grid/edit (`oms`, 41 files), the `cms` dashboard route with its injected `oms` recharts widgets, and the small `cod`/`paypal`/`stripe` admin fragments (payment settings + capture/refund buttons injected into order-edit).
5. **Admin Phase 4 — page-builder editor (deferred, last, on purpose)**: port `Editor.tsx` (3,330 lines) and its drawers/dialogs (~6,036 lines total for the editor UI) once every other admin page is stable and the storefront-side bridge (already ported earlier, since it moved with the storefront) has been battle-tested against real merchant usage. Until this phase, `/admin/page-builder/*` stays on the legacy renderer — it keeps working unmodified since the iframe it embeds is framework-agnostic about what renders inside it.
6. **Admin Phase 5 — cleanup**: delete every module's `pages/admin/**`, `src/components/admin/**`, the admin half of `src/components/common/**` and `Area.tsx`, `HydrateAdmin.tsx`, the admin Webpack config paths, and the now-fully-empty legacy pipeline (`Handler.js`'s admin dispatch, `registerAdminRoute.js`, the admin webpack-dev-middleware block). At this point the legacy Webpack/Area system is gone entirely — one framework, one app, as asked.

## Files to create / modify / delete (consolidated)

**Create** (storefront, done): `src/storefront/` tree, `lib/widgets/{registry.tsx,WidgetArea.tsx}`, `lib/checkout/paymentMethods.ts`, `bin/lib/createStorefrontMiddleware.ts`.
**Create** (storefront, pending): `lib/page-builder/{WidgetChrome.tsx,AreaDropZone.tsx,PageBuilderBridge.tsx,pageBuilderMode.ts,dropSortOrder.ts}` (ported from `components/common/page-builder/**`).
**Create** (admin, new): `app/routes/admin.*.tsx` (grows module by module per the phases above), `lib/admin/{session.ts,grid-helpers.tsx,form-helpers.tsx}`, `components/admin/**` (ported from `src/components/admin/**`).

**Modify**: `src/bin/lib/app.js` (mount point — done), `src/bin/lib/addDefaultMiddlewareFuncs.ts` (already correct — no change needed after all: route-matching's natural "no match → `currentRoute` undefined" behavior already makes the existing session-selection ternary do the right thing for cut-over paths, admin included, since it falls back based on absence of a matched legacy route), `src/bin/build/index.js` (Vite build step — done), `src/bin/lib/startUp.js` (done), `packages/evershop/package.json` (deps — done), `createStorefrontMiddleware.ts`'s gate predicate (grows every phase, both storefront and admin).

**Delete (end state, after both storefront Phase 4 and admin Phase 5)**: every module's `pages/frontStore/**` and `pages/admin/**`, `src/components/frontStore/**` and `src/components/admin/**`, all of `src/components/common/**`'s Area/Hydrate/webpack-era plumbing (the shadcn-style `ui/` primitives and form fields get ported forward, not deleted — they're reused, not replaced), `Router.js`'s admin+frontStore registries, `Handler.js`, the entire `src/lib/webpack/**` tree, `buildEntry.js`, `scanForComponents.ts`, `theme:*` CLI, `packages/storefront/` residue if any.

## Verification

**Storefront** (Phase 0 done, 1–4 as previously planned): view-source shows SSR'd HTML for cut-over pages; every widget type renders identically to the legacy admin-configured placement (now including a live check that the page-builder iframe preview still works — drag a widget onto a storefront page from `/admin/page-builder` and confirm it appears without a full reload); orders complete end-to-end for each payment method.

**Admin** (new):
- Phase 0: `/admin/login` round-trips correctly (wrong password rejected, correct password sets `asid` and redirects into `/admin`), and the `admin.tsx` layout route correctly redirects an unauthenticated request to login for any migrated admin page.
- Each subsequent phase: for every migrated module, grid pagination/sort/filter and edit-form save round-trip through `/api/admin/graphql` correctly; spot-check against the legacy page's behavior before deleting it.
- Phase 4 (page-builder editor): full manual pass — add/move/duplicate/delete a widget, edit settings (including a widget using the EditorJS-backed field), undo/redo, publish a changeset, create and later publish a rollout plan, confirm the iframe preview never desyncs (stale `sequence` numbers correctly dropped).
- Phase 5 (cleanup): full regression across every admin and storefront route; confirm no remaining imports from any deleted legacy path; confirm the built image no longer contains the Webpack/Area toolchain at all (image size should drop meaningfully — worth measuring, given the earlier Docker-size work this session already did on the storefront side).
- **Every phase**: explicit negative test that whatever hasn't been migrated yet still works unchanged via the legacy pipeline (the gate must never accidentally shadow a not-yet-migrated path).

---

# Admin Page-Builder Editor Rebuild

## Context

The storefront-side half of the page-builder (the iframe that the admin editor embeds) is already ported and live: `WidgetChrome.tsx`, `AreaDropZone.tsx`, `PageBuilderBridge.tsx`, `PreviewContext.tsx`, `pageBuilderMode.ts`, `dropSortOrder.ts`, plus a widget registry (`lib/widgets/registry.tsx`) with 17 of 23 widget types rendering on the new React Router v7 / Vite stack. The **admin-side editor** — the actual drag/drop UI at `/admin/page-builder/*` that merchants use to add, move, and configure widgets — is still the legacy `Editor.tsx` (3,330 lines) + five dialog/drawer components (2,716 more lines), rendered by the old Webpack/Area pipeline. It still works today (the iframe it embeds is framework-agnostic about what's inside it), but it's the last piece keeping the legacy renderer alive.

Three options were considered: a faithful 1:1 port of `Editor.tsx`, a scoped-down rebuild dropping rollout plans/multi-session, or leaving it on the legacy pipeline indefinitely. **The user chose a full rebuild on shadcn + dnd-kit** — same feature set, modernized implementation, not a straight port.

One architectural point settled during discussion: **the iframe-as-canvas approach stays exactly as-is.** None of the mainstream React page-builder libraries (Craft.js, Puck, GrapesJS) fit here — they all render the canvas in the same document as the editor, which would mean abandoning the "the canvas is the literal live storefront" property that makes this WYSIWYG-correct by construction. `dnd-kit` is scoped narrowly to same-window interactions (the Layers panel's drag-to-reorder); the palette → iframe drop stays native HTML5 `dataTransfer`, matching the contract `AreaDropZone.tsx` already implements (`application/x-evershop-widget` MIME type). No storefront-side code changes as part of this — the existing bridge's message surface already covers everything the new admin editor needs to send/receive (confirmed below).

## What already exists and will be reused unchanged

**Backend — zero changes.** Every mutating action goes through existing REST endpoints under `/api/page-builder/*` (`packages/evershop/src/modules/pageBuilder/api/`), framework-agnostic, called via `fetch()` with same-origin cookies (no new auth wiring — `access: "private"` already checks the `asid` session the new `admin.tsx` layout route already guards):
- `POST /api/page-builder/changesets` — create draft changeset
- `POST /api/page-builder/changesets/:id/operations` — append one op (`{route, entityUrn, oldPayload, newPayload}`; INSERT/UPDATE/DELETE inferred server-side from payload nullness)
- `POST /api/page-builder/changesets/:id/discard`
- `POST /api/page-builder/changesets/:id/move-current` — undo/redo, returns updated `canUndo`/`canRedo`
- `POST /api/page-builder/changesets/:id/publish`
- `GET/POST/PATCH/DELETE /api/page-builder/rollout-plans[/:id]`, `POST .../:id/sync`

Read state comes from existing GraphQL types (queried via `/api/admin/graphql`, admin schema): `changeset(id|uuid|token)` — `operations`, `routeCursors`, `canUndo(route)`, `canRedo(route)`, `operationCountForRoute(route)`, `operationCountsByRoute`, `rolloutPlan`; `rolloutPlan`/`rolloutPlans`/`activeRolloutPlans`; `routes` (id/name/path/editableInPageBuilder — powers the route picker).

**Storefront bridge — zero changes, already sufficient.** Confirmed message-by-message against `Editor.tsx`'s protocol:
- Outbound from iframe (already implemented in `WidgetChrome.tsx`/`AreaDropZone.tsx`, `postToParent`): `widget-selected {widgetUid, widgetType, settings}`, `widget-delete`, `widget-duplicate`, `widget-move-up`/`widget-move-down {sortOrder}`, `pb-drop {widgetType, area, sortOrder, isGlobal}`, `preview-rendered {widgetOrder}`, `pb-canvas-click`.
- Inbound to iframe (already implemented in `PageBuilderBridge.tsx`): `data-update {widgets, sequence}`, `pb-drag-start`/`pb-drag-end`, `globals-view {enabled}`, `layer-highlight {widgetUid}`.
- Deliberately not ported (matches earlier scope decisions this session): `inline-edit`/`edit-image`/`add-to-column` (the `Editable*` inline-editing kit — storefront correctness doesn't depend on it), `preview-start` (legacy loading-bar toggle with no state to hang it on in `PreviewContext`).

**Settings forms — cannot be reused, will be hand-authored new.** Legacy forms are 23 separate hand-built components registered against a Webpack-era `<Area id="widget_setting_form">` slot — that mechanism doesn't exist on the new stack, and there's no schema exposed via GraphQL to auto-generate forms from. Since every widget's `rawSettings` shape is already known (hand-transcribed once already, while building each storefront widget component this session), the new admin will hand-author one small field-config per widget type, rendered through a shared generic form renderer — new code, but small and mechanical per type, not a port.

## New code to write

**Routes** (`packages/evershop/src/storefront/app/routes/`, nested under the existing `admin.tsx` session guard):
- `admin.page-builder._index.tsx` — redirects to the editor for the first `editableInPageBuilder` route (homepage preferred), same redirect-first UX as legacy `pageBuilder/index.ts`; falls back to an empty-state list if none are editable.
- `admin.page-builder.edit.$routeId.tsx` — the editor itself.

**Editor state** (`app/lib/page-builder-admin/`, new directory): one `useReducer`-based store (not legacy's ~25-hook flat soup) holding: current changeset id/token, selected widget, `canUndo`/`canRedo`, dialog visibility flags, device/globals-view toggles. A thin `usePageBuilderApi()` hook wraps the REST calls above.

**Component tree** (`app/components/page-builder-admin/`, new directory), assembled Phase A→D below:
- `Topbar` — route name, device toggle, globals-view toggle, undo/redo (shadcn `Button`+`Tooltip`), Publish/Discard (shadcn `DropdownMenu`).
- `Canvas` — the `<iframe src="/{path}?changeset={token}">`, posts `data-update`/`pb-drag-*`/`globals-view`/`layer-highlight`, listens for the outbound message set above.
- `Palette` — list of registered widget types (reuse the same 17-type registry list conceptually, hand-mirrored here since this is admin-side, not importing storefront route code) as native-`draggable` shadcn `Card` tiles (`dataTransfer.setData('application/x-evershop-widget', type)`), plus click-to-add fallback for non-drag input.
- `Layers` — tree view built from `preview-rendered`'s `widgetOrder`, click selects + posts `layer-highlight`, drag-to-reorder via `@dnd-kit/core` + `@dnd-kit/sortable` (same-window only — posts a move op on drop, doesn't touch the iframe DOM directly).
- `SettingsDrawer` — shadcn `Sheet`, hosts the generic field-config-driven form (`Field` primitives: text/textarea/number/toggle/select/color/URL — image fields are a plain URL input for v1, full asset-picker integration deferred), debounced PATCH via `addChangesetOperation`.
- `PublishDialog`, `DiscardConfirmDialog`, `RolloutDialog`, `SessionPicker`, `ExitConfirmDialog` — shadcn `Dialog`/`AlertDialog`, same confirm/summary logic as legacy (op-count breakdown, overlap check for rollout windows), rebuilt against the new REST/GraphQL calls.

## Phasing (multi-session — Phase A is this session's target)

- **Phase A**: route picker + editor shell + iframe canvas + topbar (undo/redo/publish, no rollout yet) + palette (add via native DnD) + a generic JSON-textarea settings fallback. Goal: prove the full message-protocol + changeset/ops round trip end-to-end on the new stack before investing in per-widget forms.
- **Phase B**: Layers panel with dnd-kit reorder; replace the generic textarea with real per-widget-type field-config forms for all 17 ported widget types.
- **Phase C**: `PublishDialog`/`DiscardConfirmDialog` with real op-count summaries, `RolloutDialog` + `SessionPicker` (scheduled/staged publishing, the "lower-value" feature the user chose to keep, not drop).
- **Phase D**: polish — globals-view toggle, device-preview toggle, entity-scope selector for entity-scoped routes (landing pages), metafield guide drawer if still needed.

Only once Phase D is done and verified does `MIGRATED_PATHS` gain `/admin/page-builder(/.*)?$`, and only then does the legacy `pageBuilder/pages/admin/pageBuilderEdit/**` get deleted.

## Verification (per phase)

Dev boot + curl/browser pass, same pattern as the rest of this session: seed a test `widget_instance`/`widget_placement` row, open `/admin/page-builder/edit/homepage`, confirm the iframe loads the real storefront route with `?changeset=` applied, drag a palette item in and confirm it appears without a full reload, confirm undo/redo round-trips through `canUndo`/`canRedo`, confirm Publish actually mutates the source `widget_placement` row (check via psql), confirm a discarded changeset leaves source tables untouched. Clean up test rows after each pass, same as prior widget verification this session.

---

# Page-Builder Palette Rework (Blockforge-style block composer)

## Context

The admin page-builder editor (Phases A–D above) is implemented and working, but its palette (`components/page-builder-admin/Palette.tsx`) is a flat, unstyled list of 27 widget-type labels with no grouping, search, or visual polish. The user wants the palette/composer experience to match a reference product, **Blockforge** (`blockforge.terravidhal.me/builder`) — a shadcn-based drag-and-drop block composer with a categorized/searchable left sidebar, a "Shuffle" button that randomly assembles a full page, and Undo/Redo/Clear/Publish controls.

Live inspection of Blockforge (network requests + JS-bundle fingerprinting) confirmed its stack: Next.js + shadcn/ui (Radix underneath, confirmed via `data-radix-*` runtime attributes) + `cmdk`-style search + Motion for hover/drag polish, `better-auth` + Stripe for its own licensing. Its "Export"/"Copy CLI" feature turns a composition into a `npx shadcn add <registry-url>` command via shadcn's public custom-registry mechanism — but that only makes sense because Blockforge composes standalone code for a *separate* project. EverShop's builder already publishes composed pages live via the existing changeset/Publish flow, so there is no analogous "export" step needed — **confirmed with the user**: drop the export/CLI concept entirely; scope is the composer UX only (categorized/searchable palette + Shuffle + Clear), added onto the existing live builder.

## Approach

**Palette rework** (`components/page-builder-admin/Palette.tsx`, `lib/page-builder-admin/widgetPalette.ts`):
- `WIDGET_PALETTE` entries already carry a `category` field (`layout | content | marketing | navigation | commerce`) that the current UI ignores — group the rendered list by this field with a small-caps section header per category (matches Blockforge's "HERO" / "BENTO" section labels), reusing the existing five categories as-is rather than inventing new ones.
- Add a search `Input` above the list (the existing `~/components/ui/input.js` primitive — no new shadcn primitive needed) that filters entries by substring match against `label` (and category name), same UX as Blockforge's "Search blocks…" box. No need for `cmdk`/`Command` — a plain controlled input + `.filter()` on `WIDGET_PALETTE` matches the reference behavior without a new dependency.
- Keep the existing native-HTML5-DnD (`draggable`, `dataTransfer` on `application/x-evershop-widget`) and click-to-add behavior on each card unchanged — this part already works and matches Blockforge's own click-to-add fallback.
- Each `PaletteEntry` gets a `description` (one-line) — optional but matches Blockforge's card polish; skip if it adds too much authoring overhead, plain label-only cards are an acceptable fallback.

**Shuffle** (new `Topbar.tsx` button + new handler in `admin_.page-builder.edit.$routeId.tsx`):
- Add a "Shuffle" icon button (lucide `Shuffle`) to `Topbar.tsx`, next to Undo/Redo, wired through a new `onShuffle` prop.
- Handler composes one atomic batch of changeset operations: delete every current placement in the `content` area (reuse `buildDeleteOps` from `lib/page-builder-admin/operations.ts`), then add 4–6 widgets picked randomly from a **curated shuffle-safe subset** of `WIDGET_PALETTE` — restricted to `layout`/`content`/`marketing`/`navigation` categories only (reuse `buildAddWidgetOps`). Commerce-category widgets (`related_products`, `product_hero`, `collection_products`, etc.) are excluded from the random pool since they require a real product/collection reference to render meaningfully — picking them randomly would produce empty/broken widgets, unlike Blockforge's font-only marketing blocks which have no such data dependency.
- Because this reuses the existing `addOperation`/changeset-diff machinery, the shuffle is automatically undo-able through the existing Undo button — no new backend/API work needed, this is purely a client-side composition of existing operation-builders.

**Clear** (same `Topbar.tsx` + handler):
- Add a "Clear" button next to Shuffle, reusing `buildDeleteOps` for every current placement in the area with no re-add — same undo-ability guarantee as Shuffle.

**Explicitly out of scope**: Export/Copy CLI/shadcn-registry generation (dropped per user decision above); adding new shadcn primitives beyond what's already in `packages/evershop/src/storefront/app/components/ui/` (no `command`, `dropdown-menu`, `scroll-area`, or `sonner` needed for this — the existing `Input`/`Card`/`Badge`/`Button` set covers it).

## Files to modify

- `packages/evershop/src/storefront/app/lib/page-builder-admin/widgetPalette.ts` — no shape change needed (category already exists); only reference for grouping.
- `packages/evershop/src/storefront/app/components/page-builder-admin/Palette.tsx` — add category grouping + search filter state.
- `packages/evershop/src/storefront/app/components/page-builder-admin/Topbar.tsx` — add Shuffle + Clear buttons/props.
- `packages/evershop/src/storefront/app/routes/admin_.page-builder.edit.$routeId.tsx` — add `handleShuffle`/`handleClear` (composing ops via `lib/page-builder-admin/operations.ts`'s existing `buildAddWidgetOps`/`buildDeleteOps`, posted through the existing `pageBuilderApi.addOperation` + `afterMutation()` pattern already used for every other mutation in this file).

## Verification

Same live-verification pattern used throughout this session: seed/observe via the running dev server at `/admin/page-builder/edit/homepage`. Confirm the palette renders grouped by category with working search filtering (type a query, confirm only matching entries/categories show). Click Shuffle, confirm the canvas iframe reloads with a new random composition (4–6 widgets, none from the commerce category), confirm Undo reverts it back to the prior state via the existing `canUndo` mechanism (check `widget_placement` rows via psql before/after, same as prior verification passes). Click Clear, confirm the area empties and Undo restores it. Clean up any leftover test state afterward.

---

# Widget Variants + Sleek E-Commerce Restyle (all 27 palette entries)

## Context

The 23 widget components (26 registry types, 27 palette entries — `RecommendationShelf.tsx` alone backs 4 commerce types: `related_products`/`frequently_bought_together`/`upsell_products`/`cart_frequently_bought_together`) each render exactly one fixed layout today, styled inconsistently — 15 already use at least one shadcn primitive (`AspectRatio`/`Button` are the workhorses), 7 are fully hand-rolled Tailwind (`AnnouncementBar`, `BentoGrid`, `Columns`, `FooterMenu`, `Section`, `TextBlock`, `TrustStrip`). The user wants every widget to (a) get multiple selectable variants, shown as **separate palette cards** (matching Blockforge's block-gallery UX — confirmed in the prior clarification round), and (b) get a visual polish pass toward a sleeker, e-commerce-appropriate look, applied to the existing default look too, not just new variants — across **all 27** palette entries in one pass.

Investigation (two Explore agents) found the design is cheaper than "27 × N new layouts" suggests: **most widgets already have real visual variance sitting unused in their settings** — `BrandStory` already has a 4-way `layout` enum (image-left/image-right/centered/pull-quote), `SplitFeature`/`CollectionSpotlight`/`ProductHero` already swap via `imagePosition`, `Banner`/`Section`/`SimpleSlider` already have overlay-tint variance, `CategoryMosaic` already has `layout: grid|asymmetric`. For these, a "variant" is just a different `defaultSettings` preset behind a new palette card — no new render branches needed, only the restyle pass. A minority of widgets render one fixed layout with no variance lever at all (`AnnouncementBar`, `BentoGrid`, `CouponBlock`, `FeaturedBlogs`, `FooterMenu`, `RecommendationShelf`, `CollectionProducts`, `CollectionStack`, `BasicMenu`) — these need one small new layout branch each to earn a second variant honestly.

Also confirmed structurally sound: `widget_instance.settings` is an unconstrained `jsonb` column with zero schema validation anywhere in the write path (`addChangesetOperation.ts` → `changeset_operation.new_payload` jsonb → publish), so a new `variant` key inside `settings` requires **no backend/DB changes**, and `getStorefrontWidget(type)` in `registry.tsx` is a 1:1 `type`→component map that stays untouched — variant dispatch happens entirely inside each component, reading `widget.rawSettings.variant`.

## Approach

### 1. Variant plumbing (foundational — do first, touches the palette/lookup layer only)

Confirmed via investigation: the **only** thing that breaks with multiple palette entries sharing one `type` is `paletteEntry(type)`'s `Array.find`, which always resolves to the first match — both `Palette.tsx`'s `onDragStart`/`onClick` and the two call sites in the editor route (`pb-drop` handler, `handleAddFromPalette`) only ever have the bare `type` string available, because `AreaDropZone.tsx` is a dumb passthrough (reads `application/x-evershop-widget`/`text/plain` off `dataTransfer`, forwards whatever string it finds in the `pb-drop` message — it has no opinion on what that string means). `handleShuffle`/`handleClear`/`widget-duplicate` are unaffected (they never call `paletteEntry`).

Fix: add a unique `variantId: string` (e.g. `"banner:split"`) to `PaletteEntry` in `lib/page-builder-admin/widgetPalette.ts`, alongside a `variant: string` key baked into that entry's `defaultSettings`. Update:
- `Palette.tsx` — `key`, `dataTransfer.setData(...)`, and `onClick` all switch from `entry.type` to `entry.variantId`.
- `widgetPalette.ts`'s `paletteEntry()` — looks up by `variantId` instead of `type` (rename param accordingly); `type` stays on the entry for `buildAddWidgetOps({ type: entry.type, ... })` calls, unchanged.
- `admin_.page-builder.edit.$routeId.tsx` — the `pb-drop` handler and `handleAddFromPalette` pass the identifier through unchanged in structure, just now a `variantId` string instead of bare `type`.
- `shuffleCandidates()`/`handleShuffle` need no change — they already operate on full `PaletteEntry` objects, so `defaultSettings.variant` flows through automatically. `SHUFFLE_CATEGORIES` stays the same (commerce still excluded).

Each widget's `fieldConfig.ts` entry also gets one new `{ key: 'variant', label: 'Variant', type: 'select', options: [...] }` field (first in the list) so a merchant can still change variant after placement, not just at drag-time.

### 2. Shared restyle language (apply once, reuse everywhere)

To avoid 23 independently-invented redesigns, every widget gets the same small set of polish moves, using only primitives already in `components/ui/` (no new shadcn deps needed — the existing 19 primitives cover it):
- Consistent radius (`rounded-lg`/`rounded-xl`) and a subtle `shadow-sm` on any widget that wraps content in a `Card`-like surface (new: wrap `AnnouncementBar`, `TrustStrip`, `BentoGrid`, `FooterMenu` content in `Card`/`CardContent` where it reads as a "block" rather than raw text — matches `CouponBlock`/`FeaturedBlogs`'s existing pattern).
- `Badge` for eyebrows/tags/labels wherever a widget currently renders one as plain uppercase text (`Banner`, `SplitFeature`, `CollectionSpotlight`, `ProductHero`, `BrandStory` eyebrows) — small change, immediately reads more "product-page" than "blog post."
- Consistent `Button` variant usage (`filled`/`outline`/`link` styles already modeled in several widgets' settings — extend that enum consistently to every widget with a CTA instead of ad hoc classes).
- Image treatments: keep `AspectRatio` everywhere it's already used; add it to the two image-bearing widgets that currently lack it if any (verify at implementation time — most already have it).
- Fix the dead settings found during investigation while restyling their widgets, since they're already exposed as (non-functional) fields: `SimpleSlider`'s `dots` (add real dot indicators via a small state + `CarouselApi` listener, same pattern shadcn's carousel docs use), `AnnouncementBar`'s `delay` (implement the rotation the setting implies).

### 3. Per-widget variant plan

Two tiers — **preset** (existing settings axis repackaged as a second palette card, zero new render logic) and **new** (needs one additional small layout branch in the component). Two variants per widget minimum unless noted.

| Widget (`type`) | Variant A (existing default) | Variant B | Tier |
|---|---|---|---|
| `banner` | Centered overlay (`contentPosition: mc`, dark tint) | Split anchor, gradient tint, no-copy image-link mode | preset |
| `simple_slider` | Wide (`21:9`), bottom-left overlay | Square (`1:1`) "spotlight" card overlay | preset (+ new: real dot indicators) |
| `split_feature` | Image left | Image right, full-bleed `imageFit: cover` | preset |
| `brand_story` | Image left | Pull quote (and Image right / Centered available as extra presets if time allows) | preset |
| `category_mosaic` | Grid | Asymmetric hero tile | preset |
| `tiered_categories` | Grid with images | Compact text-only list (no images) | new (small — skip image column) |
| `trust_strip` | Centered, icons, no divider | Left-aligned, divided, no icons | preset |
| `announcement_bar` | Static single message | Rotating (uses the now-implemented `delay`) | new (small — interval + fade) |
| `coupon_block` | Card row (current) | Compact inline strip (no `Card`, single line) | new (small — alt layout branch) |
| `bento_grid` | Hero + tiles (current) | Equal grid (no forced 2×2 hero) | new (small — conditional hero sizing) |
| `columns` | (existing `ratio`/`contentPosition` settings — no palette-visible "variant" needed, container widget) | — | n/a (restyle only) |
| `section` | Boxed | Full-bleed (`width: wide`) | preset |
| `separator` | With line | Spacer only (no line) | preset |
| `faq_block` | Single-open accordion, normal width | Multi-open, wide | preset |
| `text_block` | (content-driven, no variant concept) | — | n/a (restyle only — none needed, it's rich text) |
| `basic_menu` | Underline-hover style | Pill-hover style | new (small — CSS-only) |
| `footer_menu` | Plain columns (current) | Columns wrapped in bordered `Card` blocks | new (small — wrapper only) |
| `collection_products` | Grid (current) | Horizontal `Carousel` rail (reuses `SimpleSlider`'s carousel pattern) | new |
| `collection_stack` | Stacked rows (current) | Stacked rows with `Carousel` rail per row | new (reuses the above) |
| `collection_spotlight` | Image left | Image right | preset |
| `product_hero` | Image left | Image right | preset |
| `related_products` / `frequently_bought_together` / `upsell_products` / `cart_frequently_bought_together` | Grid (current, shared `RecommendationShelf`) | `Carousel` rail (same shared component, one new branch covers all 4 registry types at once) | new (one shared change) |
| `featured_blogs` | Grid (current) | `Carousel` rail | new (reuses the same carousel pattern) |

`Columns`/`TextBlock` are intentionally left at one palette entry each (container/content-driven, "variant" isn't a meaningful concept for either) — restyle pass still applies where visible (e.g. `TextBlock`'s prose typography).

The `Carousel`-rail variant is the one piece of genuinely shared new code — factor the "horizontal scrolling product rail" JSX out of `SimpleSlider`'s existing `Carousel` usage into a small shared `~/components/widgets/ProductRail.tsx` presentational component (takes `products: ProductCardFragment[]`), used by `CollectionProducts`, `CollectionStack`, `RecommendationShelf`, and `FeaturedBlogs`'s new carousel branch — avoids writing the same carousel markup 4 times.

## Files to modify

- `lib/page-builder-admin/widgetPalette.ts` — `variantId` field, expand `WIDGET_PALETTE` from 27 to ~50 entries per the table above.
- `components/page-builder-admin/Palette.tsx` — switch key/drag/click identifiers from `entry.type` to `entry.variantId`.
- `lib/page-builder-admin/fieldConfig.ts` — add a `variant` select field per widget type.
- `routes/admin_.page-builder.edit.$routeId.tsx` — no structural change, `paletteEntry(...)` call sites keep working once the lookup key changes.
- `components/widgets/*.tsx` — all 23 files get the shared restyle pass (§2); the ones marked "new" in the table above get one additional conditional render branch keyed on `widget.rawSettings.variant`.
- `components/widgets/ProductRail.tsx` — new shared carousel-rail component.

## Verification

Type-check (`npx tsc --noEmit -p .` from the storefront dir — expect only the 3 pre-existing baseline errors). Then, per the session's established pattern: boot the dev server, open `/admin/page-builder/edit/homepage`, drag each new variant card onto the canvas and screenshot it to confirm the visual is distinct from its sibling variant and reads as intended; spot-check the `variant` field in `SettingsDrawer` correctly switches an already-placed widget between variants; confirm `Shuffle` (which now draws from a larger `WIDGET_PALETTE`) still only ever picks non-commerce entries. Clean up seeded test widgets/placements after each check, same as every prior verification pass this session.

---

# Shadcn-Standard Theme Tokens + Live Theme Editor in the Page-Builder

## Context

The user wants EverShop's base CSS to run on shadcn's standard oklch color tokens (pasteable directly from any shadcn theme export — `:root { --background: oklch(...); ... } .dark { ... }`), and wants a theme editor built into the page-builder ("website builder") itself: paste/adjust a theme, see it live on the real canvas, click Apply to make it the live site's theme.

Investigation found a theme system already exists and is more complete than expected, but has real gaps against this ask:
- `app.css`'s `:root` (`packages/evershop/src/storefront/app/app.css`) is hand-authored **hex**, not oklch, and only defines 19 of the ~35 tokens a full shadcn theme export uses — no `--chart-1..5`, no `--sidebar*` (8 tokens), no `.dark` block at all.
- `ThemeTokens` (`lib/theme/tokens.ts`) is a **fixed 9-key shape** (7 named colors + `radius` + `fontSans`), duplicated by hand in two places (`tokens.ts` and the admin `ThemeBuilder.tsx`) per their own doc comments. It has no slot for an arbitrary pasted theme, and `themeTokensToCss()` only ever emits a `:root {...}` block — no dark-mode output at all today.
- The existing admin editor (`/setting/theme`, legacy Webpack/Area pipeline) previews against a **fake mockup component**, not the real storefront — exactly what the user is asking the page-builder to fix by previewing against the real iframe canvas instead.
- **Real bug found in the write path**: `root.tsx`'s loader wraps the theme-bearing settings query in `cached('fragment:settings', CACHE_TTL.fragment, ...)` with no invalidation wired up (confirmed by the route's own comment) — today, saving a theme change does **not** show up live; it silently waits out the cache TTL. This directly undermines "click apply to apply to whole evershop," so it's an in-scope fix, not a new feature.
- **User decision**: retire the legacy `/setting/theme` Theme Builder page (redirect it into the page-builder's new Theme panel) rather than patching it to coexist — avoids two editors able to silently clobber each other's writes to the same `themeTokens` JSON blob.

## Approach

### 1. Base CSS → standard shadcn oklch tokens

Rewrite `app.css`'s `:root` using the oklch values the user pasted (shadcn's own default neutral theme) as EverShop's new baseline — not just an optional override merchants can paste over hex, the actual default. Add a `.dark { ... }` block (currently absent) using their pasted dark values, gated by the file's existing `@custom-variant dark (&:is(.dark *));`. Extend both the `:root`/`.dark` blocks and the `@theme inline` mapping with the tokens currently missing: `--chart-1` through `--chart-5`, and `--sidebar` + its 7 `--sidebar-*` companions — harmless to add even though no `Sidebar`/`Chart` shadcn primitive is installed yet (`components/ui/` has 19 primitives, neither of those), and means a future `npx shadcn add sidebar` drops in without any token-plumbing work. Keep `--radius` at a sensible non-zero default (the user's pasted example uses `0`, i.e. that specific theme is square-cornered — that's one theme choice, not necessarily EverShop's default) unless told otherwise.

### 2. Extend the token model without breaking the existing 9-key shape

Add two new optional fields to `ThemeTokens` (`lib/theme/tokens.ts`): `customLightCss?: string` and `customDarkCss?: string` — raw CSS custom-property declarations (the *body* of a pasted `:root {...}`/`.dark {...}` block, not the whole rule). `themeTokensToCss()` changes to emit **both** blocks now:
```
:root {
  <existing 9 named-token declarations>
  <customLightCss, verbatim, if present>
}
.dark {
  <customDarkCss, verbatim, if present>
}
```
Custom CSS is appended *after* the named-token lines so a full paste always wins over the individual color-picker fields for any token it also sets (later-wins cascade, same reasoning the file's own doc comment already uses to describe how `<ThemeStyle>` beats `app.css`'s defaults). This is additive — the existing 9 keys, `resolveThemeTokens()`, and `DEFAULT_THEME_TOKENS` shape are untouched, so nothing that currently reads `ThemeTokens` needs to change.

A small parser, `parseShadcnThemeCss(raw: string): { light: string; dark: string }` (new, in `tokens.ts`), regex-extracts the bodies of the first `:root { ... }` and `.dark { ... }` blocks in whatever's pasted — explicitly scoped to flat `--var: value;` declarations only (no nested at-rules/media queries), which is exactly the shape every shadcn theme export actually produces. State this limitation plainly in the code comment.

### 3. Theme panel inside the page-builder editor (live preview + Apply)

New "Theme" button in `Topbar.tsx` (next to Globals) opening a shadcn `Sheet` (matching `SettingsDrawer.tsx`'s existing pattern) with one large `Textarea` for pasting a full shadcn theme snippet.

**Live preview** — reuses the existing iframe/postMessage bridge, the same mechanism `globals-view`/`layer-highlight` already use:
- On every paste/edit (debounced), the editor route calls `parseShadcnThemeCss()` and posts `{ type: 'theme-preview', light, dark }` to the canvas iframe via the same `postToCanvas` helper `admin_.page-builder.edit.$routeId.tsx` already has for `globals-view`.
- `PageBuilderBridge.tsx` gets one new message-type branch (same shape as its existing `globals-view`/`layer-highlight` handlers): creates or updates a `<style id="evershop-pb-theme-preview">` element, appended at the end of `<head>` so it wins the cascade over `<ThemeStyle>`'s own tag, containing `:root{${light}} .dark{${dark}}`. This previews against the **real** storefront rendering in the canvas — a genuine upgrade over the legacy page's fake mockup preview.

**Apply** — POSTs the parsed `{ light, dark }` merged into the existing tokens object (`{ ...currentTokens, customLightCss: light, customDarkCss: dark }`) to the existing legacy `POST /settings` endpoint (`packages/evershop/src/modules/setting/api/saveSetting/`) — already generically accepts any JSON blob per setting key, no request-shape change needed there.

### 4. Fix the cache-invalidation gap (required for "Apply" to actually mean "live")

`saveSetting.js`'s handler needs to invalidate the storefront's `fragment:settings` cache entry after a successful `themeTokens` save, so the change is visible immediately instead of waiting out `CACHE_TTL.fragment`. Verify at implementation time whether the legacy pipeline can reach the RRv7 app's `invalidateByPrefix()` (`lib/cache/middleware.ts`) directly, or whether the fix needs to go through `getRedis()` with a direct key `del` — both modules ultimately read the same Redis instance via `REDIS_URL`, but the legacy pipeline and the RRv7 app are separate module trees, so the cross-import path needs a quick check rather than being assumed here.

### 5. Retire the legacy Theme Builder page

Per the user's decision: `packages/evershop/src/modules/setting/pages/admin/themeBuilder/ThemeBuilder.tsx` stops rendering its color-picker form and instead redirects (client-side, on mount — same `route.json`/`index.ts` registration stays, no route removal needed) into the page-builder's homepage editor with the new Theme sheet open. `ThemeBuilderMenu.tsx` (the admin settings-sidebar entry) either gets removed or repointed at the page-builder URL instead of `url(routeId: "themeBuilder")`.

## Files to modify

- `packages/evershop/src/storefront/app/app.css` — oklch `:root`, new `.dark` block, `--chart-*`/`--sidebar-*` additions to both the token blocks and `@theme inline`.
- `packages/evershop/src/storefront/app/lib/theme/tokens.ts` — `customLightCss`/`customDarkCss` fields, `themeTokensToCss()` dark-block support, new `parseShadcnThemeCss()`.
- `packages/evershop/src/storefront/app/lib/page-builder/PageBuilderBridge.tsx` — new `theme-preview` message handler, following the existing `globals-view` branch's exact pattern.
- `packages/evershop/src/storefront/app/components/page-builder-admin/Topbar.tsx` — new "Theme" button/prop.
- `packages/evershop/src/storefront/app/routes/admin_.page-builder.edit.$routeId.tsx` — Theme sheet state, debounced preview postMessage, Apply handler (POST to `/settings`).
- New: `packages/evershop/src/storefront/app/components/page-builder-admin/ThemeSheet.tsx`.
- `packages/evershop/src/modules/setting/api/saveSetting/*` — cache-invalidation fix for `themeTokens` saves.
- `packages/evershop/src/modules/setting/pages/admin/themeBuilder/ThemeBuilder.tsx` and `.../all/ThemeBuilderMenu.tsx` — retire/redirect per decision above.

## Verification

Type-check first. Then live: open `/admin/page-builder/edit/homepage`, open the new Theme sheet, paste the exact oklch snippet the user provided, confirm the canvas iframe updates live (screenshot before/after) without a page reload. Click Apply, confirm (a) a fresh request to any storefront page (new tab, not the cached one) shows the new theme immediately — proving the cache-invalidation fix actually works, not just "eventually" — and (b) `setting.themeTokens` in Postgres contains the new `customLightCss`/`customDarkCss` values (psql check, same pattern as every prior verification pass this session). Confirm `/setting/theme` now redirects instead of showing the old color-picker form. Clean up any test theme state afterward by restoring the prior `themeTokens` value.
