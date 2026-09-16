# Blocks → page builder: the EverShop side

How the block library (a separate repo) reaches this store's Puck page
builder, and what's left to build here.

> The previous PLAN.md — five stacked plans covering the Vite SSR rewrite,
> the admin migration, and the Puck cutover, several since superseded by
> later decisions (its Puck-rejection call was reversed) — is archived at
> [`docs-plan-vite-ssr-and-puck-history.md`](./docs-plan-vite-ssr-and-puck-history.md).

## Where the two halves of this work live

**Blocks repo** (`~/Projects/blocks/vite-monorepo`, separate git history) is
where blocks are designed, previewed and parameterized. It has its own
`PLAN.md` covering that side — the authoring contract, the 8-style theme
registry, and the block-side view of this same integration.

**This repo** is where a parameterized block becomes a real Puck widget:
restyled onto EverShop's own primitives, wired into the four-file widget
contract, and rendered on a live storefront page.

**The boundary going forward:** block authoring (writing components, writing
`.block.ts` schemas, iterating in the gallery) happens in the blocks repo,
driven directly. Everything in *this* file is scoped to landing already-
parameterized blocks here — no further changes should be needed in the
blocks repo to make progress on what follows, short of pulling in a newly
finished block's source and schema.

---

## The finding that shaped this

**EverShop already ships a complete visual page builder.** Puck
(`@puckeditor/core@^0.23.0`), cut over — every migrated route renders through
it: ~53 palette entries over ~28 widget types, nested containers, changeset
draft/undo/redo/publish, scheduled rollouts, entity-scoped documents, a live
theme editor. This was never a greenfield build; it's feeding an existing,
opinionated builder a much larger library, so **EverShop's widget contract
governs**.

Authoritative doc: `packages/evershop/src/storefront/app/components/widgets/README.md`.
Two hard rules from it that constrain everything below:

- **The persisted `type` string can never be renamed** — it lives in every
  Puck document's `ComponentData.type`, and there is no migration for it.
- **Never fetch data in a component** — server data goes through
  `resolvePuckExtras.ts`, keyed on `props.id`.

`lib/puck/buildPuckConfig.ts` generates the actual Puck config from three
existing sources (palette, fieldConfig, registry). It **iterates the
palette, not the registry**, and silently skips any entry whose component
isn't registered — a missing half is an invisible absence, not an error.

---

## Decisions taken

1. **Restyle blocks onto EverShop's own shadcn** — do not vendor the block
   library's `cn-*` class system or its 8-style registry (~600KB of CSS).
   Measured, not assumed: the library's `TEXT_STYLES` flattens cleanly into
   plain Tailwind (`.cn-heading-1` is just `text-4xl font-extrabold
   tracking-tight`, itself copied from shadcn's canonical scale), and ~80%
   of all primitive imports across the 377 blocks are button/card/badge/
   input/avatar/separator — all of which this repo already has. Restyling
   also avoids a real dependency conflict: the block library pins
   `@base-ui/react ^1.7` and `lucide-react ^1.34` against this repo's `^1.1`
   and `^0.562`.
2. **Parameterization happens upstream**, in the blocks repo, before a block
   ever reaches here. A block without a `.block.ts` schema is not a
   candidate for porting.
3. **Theming stays split by stage.** The 8-style *shape* axis is a
   dev-exploration tool and stays in the blocks repo. The color/radius/font
   *modification* axis extends to production via this repo's existing
   `ThemeSheet.tsx` — a merchant retheming their own store is an extension
   of something that already ships, not a new build.
4. **Walking skeleton before scale.** One block ported and verified by hand
   before writing any generator.
5. **Licensing** — settled outside this plan.

### What restyling costs

Confirmed during Phase 0: EverShop's button scale sits a rung larger than
the block library's (`h-9` default here vs. `h-8` there). Ported blocks will
not be pixel-identical to the gallery. Accepted deliberately — it's what
makes them track a merchant's actual theme instead of carrying a second,
frozen design system.

---

## The widget contract being fed

Four files per widget, fixed by the existing system:

1. **Component** in `app/components/widgets/` (or, for ported blocks,
   `app/components/widgets/blocks/`) taking `WidgetComponentProps`; content
   comes from `widget.rawSettings`.
2. **Registration** — `registerStorefrontWidget(type, Component)` in
   `lib/widgets/bootstrap.ts`.
3. **Palette entry** in `lib/page-builder-admin/widgetPalette.ts`.
4. **Field config** in `lib/page-builder-admin/fieldConfig.ts`.

### The pattern for a ported block

```
app/blocks/<registry>/<item>/<file>.tsx      restyled source (theirs, ported)
app/components/widgets/blocks/<Name>.tsx     adapter (ours, generated)
app/lib/blocks/text.tsx                      Multiline helper
app/lib/blocks/text-styles.ts                flattened TEXT_STYLES
app/lib/blocks/defaults.ts                   withBlockDefaults()
app/lib/blocks/manifest.json                 (to add) frozen id -> type map
```

Keeping restyled source (`app/blocks/`) separate from the adapter
(`app/components/widgets/blocks/`) keeps the "theirs vs. ours" boundary
legible, and makes a whole registry removable by deleting one directory.

### The adapter shape

One file per block, explicit prop-by-prop — never a spread, since the
explicit list is what makes the schema↔props contract testable:

```tsx
export function UlAboutBusiness({ widget }: WidgetComponentProps) {
  const s = withBlockDefaults(widget.rawSettings, DEFAULTS);
  return <AboutBusiness heading={s.heading} ctaLabel={s.ctaLabel} /* ... */ />;
}
```

`withBlockDefaults` resolves a real contradiction in this repo:
`buildPuckConfig.ts` argues (correctly) that palette `defaultSettings` must
stay empty, since those values are persisted the instant a widget is
dropped and would ship to a live store — while `README.md` asks for
presentable defaults so a dropped block isn't an unclickable zero-height
gap. Both hold when the defaults live in the adapter: the document only
ever stores what a merchant actually typed, and the block still renders
complete the moment it lands.

### The `type` naming scheme

`block_<registry-abbrev>_<item>` — e.g. `block_ul_about_business`. The
abbreviation is load-bearing: several source registries contain a block
literally named `hero-1`. The `block_` prefix keeps ported types visually
distinct from the ~28 native ones and makes "which ported blocks are
actually in use" a query.

**A trap already hit once:** `paletteDefaults()` in `buildPuckConfig.ts`
splits a palette `label` on an em dash to strip a variant suffix
(`"Banner — Split"` → `"Banner"`). A ported block's label must never contain
one, or it silently truncates to a near-meaningless word in the drawer.

### Category mapping, many → 5

`PaletteEntry.category` is a 5-value union (`layout | content | marketing |
navigation | commerce`), too coarse to group 40-100 ported blocks on its
own. Plan: add an optional `group?: string` carrying the block's own
(finer) category, and drive Puck's drawer grouping off `group ?? category`.
Not yet implemented — needed once more than a handful of blocks land.

---

## Status

### Phase 0 — spikes. ✅ Done.

- `TEXT_STYLES` flattened into `app/lib/blocks/text-styles.ts` — all 31 text
  roles, no loss, since the source classes were already plain Tailwind under
  the hood.
- Primitive gaps backfilled additively (no existing call site changed
  behavior): Button `xs` / `icon-xs` / `icon-sm` / `icon-lg`, Badge `ghost` /
  `link`, `CardAction`. Sized to extend *this* repo's ladder, not copy the
  block library's denser one.
- Radius ladder extended with `--radius-2xl/3xl/4xl` in this repo's additive
  idiom (`calc(var(--radius) + Npx)`, not the library's multiplicative one).
  Without these, a block's `rounded-2xl`+ silently stopped tracking
  `--radius` and fell back to Tailwind's fixed defaults. `--font-heading`
  added as a seam (mapped to `--font-sans` today).
- **Puck 0.23 capability check:** `Config.categories` exists as assumed.
  `overrides.componentItem` exists but its payload carries only
  `{children, name}` — thumbnails will need to be looked up by type from our
  own map, not read off the payload. **Drawer search does not exist**
  (`showSearch` belongs to `ExternalField`, not the drawer) — building one
  needs `overrides.components`.
- Storefront typecheck baseline: **149 pre-existing errors**, unrelated to
  this work. Any future "is it clean?" check compares against 149, not zero.

### Phase 1 — walking skeleton, one block end to end. ✅ Done.

Ported `ui-layouts/about-business` by hand — chosen because it was fully
hardcoded upstream, so it exercised the hard case (writing a schema from
scratch) rather than the easy one (a block that already took props).

Verified live against a dev server running on the project's existing
Postgres:

- Reaches `buildPuckConfig()` with all 8 fields and both array `itemFields`
  intact.
- Renders as `WidgetBoundary → UlAboutBusiness` with props threaded
  correctly.
- Produces full, presentable content from **empty** `rawSettings` (heading
  with its line break, both stat tiles, both points, CTA) — proving
  `withBlockDefaults` resolves the empty-palette-defaults vs.
  presentable-content tension in practice, not just on paper.
- Storefront renders with a clean console; typecheck holds at the 149
  baseline.
- Found and fixed the em-dash label truncation bug above.

**Not yet verified:** the actual editor UI — drag from the drawer, edit a
field in the sidebar, publish. That needs an admin login this session
doesn't have credentials for. Everything upstream of the UI is proven; this
is the one remaining unverified step for the single ported block.

### Phase 2 — the generator. Next.

`scripts/port-to-evershop.ts`, living in the blocks repo (it needs access
to the block sources and their `.block.ts` schemas). Reads a block's schema
— which already mirrors this repo's `FieldConfig` vocabulary field-for-field
by design — and emits the four artifacts above.

Concretely, per block:

- Rewrite imports: the block library's primitive imports → this repo's
  `~/components/ui/*`; its `text-styles` module → the flattened copy here;
  strip `"use client"`; normalize `framer-motion` → `motion/react`.
- Map each schema field 1:1 to a `FieldConfig` entry (the vocabularies
  already match, so this is closer to a rename pass than a translation).
- Emit the adapter in the `UlAboutBusiness` shape, diffed against that file
  as the generator's acceptance test — regenerate the Phase-1 block and the
  diff should be empty or trivial.
- Detect `useState(<prop>)` in the source (props copied into state at
  mount defeat live editing in the Puck canvas) and add a settings-hash
  remount key in edit mode. Needs `isEditing` — already computed in
  `buildPuckConfig.ts` — threaded onto `WidgetComponentProps` as an
  optional `editing?: boolean`; additive, one place.
- Emit a port report: tier, unmapped fields, third-party imports, any
  top-level `window`/`document` usage.

### Phase 3 — first real batch + palette UX. Not started.

~15 blocks spanning multiple categories, landed together so review is
comparative. This is also where the flat drawer starts to hurt, so
`categories`, search (`overrides.components`), and thumbnails
(`overrides.componentItem`, looked up by type) land in the same pass. This
is the decision point for total coverage, replacing estimates with real
throughput from the blocks repo.

### Phase 4 — scale to the curated v1 set. Not started.

Target ~40 blocks (every landing-page section, twice over), ceiling
~80-100. Selection happens in the blocks repo per its own curation
criteria (e-commerce relevance, theme-token cleanliness, SSR safety);
landing them here is category batches with a visual-regression check per
batch.

### Phase 5 — hardening. Not started.

Bundle-size audit (blocks pull in `motion`, various icon packages),
lazy widget registration (`bootstrap.ts` currently registers every type
eagerly — fine at ~28, will make the editor's already-~50s cold load worse
at 100+), and a `blocks` section added to `components/widgets/README.md`.

---

## Risks tracked, not yet hit

**SSR.** Blocks were written for a Vite SPA; this repo does real SSR.
Top-level `window`/`document` access is a hard crash at import — the
walking-skeleton block had none, but later blocks will. `recharts` (used by
a handful of blocks) is known SSR-hostile and is excluded from the curated
set outright. The concrete gate: an SSR smoke test that `renderToString`s
every registered block with its defaults, to be added once there's more
than one block to smoke-test.

**Editor load time.** `vite.config.ts` already documents ~150 modules
loaded twice (shell + canvas realm) on a cold start. Eager registration of
40+ blocks, each potentially pulling `motion` and an icon package, will
make that worse. Lazy registration (Phase 5) needs to land before the
block count grows much past what's here now.

**Images.** The block library hotlinks `images.unsplash.com` in several
defaults. Not acceptable in a shipped storefront — the port must rewrite
these to local placeholders and route real uploads through this repo's
`imageUrl()` / `ImageUploader`.

---

## Verification

**The byte-diff harness is unaffected** — `puck-byte-diff.spec.ts` compares
the legacy widget pipeline against Puck for *existing* documents, and
ported-block widgets appear in none yet. Confirm this stays true after each
batch rather than assuming it.

Guardrails to add, cheapest first:

1. **Manifest snapshot** (unit) — the frozen `type` strings in
   `app/lib/blocks/manifest.json` (to be created alongside Phase 2).
   Renaming a persisted type must fail CI.
2. **Contract test** (unit) — for every ported type, `fieldConfig` keys are
   a subset of the adapter's known props, and every `array` field's
   `defaultItem` matches its `itemFields`.
3. **SSR smoke** (unit) — `renderToString` every registered block with
   `withBlockDefaults({})`.
4. **Palette completeness** — extend `puck-route-isolation.spec.ts`; its
   locator will need to reach into collapsed drawer categories once
   `categories` ships.
5. **e2e** — drop a block, edit a field, confirm the canvas updates (the
   test that would have caught a `useState(props)` block), publish, assert
   the storefront renders it.
6. **Visual regression** — once more than ~20 blocks are ported.

Type-check this repo's storefront **only** via `npm run typecheck:storefront`
from the repo root — `npx tsc -p .` from inside `src/storefront` resolves
the wrong tsconfig and reports success while checking nothing.

---

## Open decisions

1. **The v1 block set** — needs a human with the merchant perspective;
   selection happens in the blocks repo.
2. **Visual drift tolerance** — confirmed non-zero in Phase 0/1; worth a
   look at a batch of rendered blocks before Phase 3, not just the one.
3. **`withBlockDefaults` semantics** — a merchant can't blank a field to
   nothing; clearing it restores the default. Right for headings/CTAs,
   possibly wrong elsewhere.
4. **Motion budget** — `motion` is ~30-50KB gzipped if pulled onto the
   storefront bundle.
5. **Ported blocks in the existing 5 palette categories, or a separate
   "Blocks" drawer section?** Leaning toward blending via `group`.
