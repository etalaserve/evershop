# Widgets

Everything a merchant can place on a page. There are two kinds, and the
difference decides where the file goes and where its data comes from.

| Kind | Folder | Data source |
| --- | --- | --- |
| **Content widgets** — banners, menus, text, FAQ | `components/widgets/` | its own settings, edited in the sidebar |
| **Commerce furniture** — gallery, price, add-to-cart, cart lines | `components/widgets/commerce/` | the entity the page is about, via `page` |

A widget renders on **both** pipelines: the legacy widget path and Puck. It is
the same component either way, so it must work from `widget.rawSettings`
regardless of which one is driving. The byte-diff harness
(`tests/e2e/pageBuilder/specs/00-migration/puck-byte-diff.spec.ts`) fails if the
two ever disagree.

---

## Adding one

Three files, minimum. The Puck config is **generated** from them — you never
hand-write a Puck component definition, which is what keeps
`registerStorefrontWidget()` working for extensions.

**1. The component** — `components/widgets/MyBlock.tsx`

```tsx
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

export function MyBlock({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as { heading?: string };
  return <h2 className="text-2xl font-semibold">{s.heading}</h2>;
}
```

**2. Register it** — `lib/widgets/bootstrap.ts`

```ts
registerStorefrontWidget('my_block', MyBlock);
```

**3. Palette entry** — `lib/page-builder-admin/widgetPalette.ts`

```ts
{
  type: 'my_block',
  variantId: 'my_block:default',
  label: 'My block',
  category: 'content',              // layout | content | marketing | navigation | commerce
  defaultSettings: { heading: 'A heading' }
}
```

**4. Settings form** (optional but almost always wanted) —
`lib/page-builder-admin/fieldConfig.ts`

```ts
my_block: [
  { key: 'heading', label: 'Heading', type: 'text' }
]
```

Then **restart the dev server**. `src → dist` is compiled by the dev server's
startup (`bin/dev/compileTs`), *not* by `npm run build`. A backend change that
"isn't taking effect" is almost always this.

---

## Rules that bite

Most failures here are silent — nothing throws, the block just isn't there. In
rough order of how often they catch people out:

### The `type` string is persisted data

It is stored in `widget_instance.type` and in every Puck document's
`ComponentData.type`. Renaming it orphans existing content and there is no
migration for it. Pick it once.

### A missing palette entry means the widget silently does not exist

`buildPuckConfig()` iterates the **palette**, not the registry, and skips any
entry whose component is not registered. Miss either half and there is no
error — just an absent block. `puck-route-isolation.spec.ts` asserts the
palette is complete for exactly this reason.

### One component per type, not per variant

~50 palette entries are backed by 41 types. A "variant" is a second palette
entry with the same `type` and different `defaultSettings`, usually driving a
settings axis the component already reads (`variant`, `imagePosition`,
`layout`).

Registering per variant would mean per-variant strings in the database, and
the migration cannot reconstruct them: existing rows carry only `type`, and
once a merchant edits one field the two are indistinguishable.

### Give `defaultSettings` presentable values

Empty strings render nothing, so the block collapses to zero height and cannot
be clicked to configure. The editor draws a labelled dashed shell over empty
components to soften this, but it is a safety net, not a substitute — a widget
should look like something the moment it lands.

### Containers must declare their slots

Add the type to `CONTAINER_SLOTS` in `lib/puck/buildPuckConfig.ts`:

```ts
columns: 4,                                  // indexed  → col0…col3
cart_switch: ['whenEmpty', 'whenFilled']     // named    → semantic regions
```

Read children from the `slots` (indexed) or `namedSlots` (named) props — not
`widget.columns`, which is empty under Puck.

**Skipping the declaration is the worst failure in this file.** Puck hands the
raw child array to `render()` and React throws `Element type is invalid`; in
other arrangements the container renders happily while dropping every child.

Use named slots when the regions mean different things. `whenEmpty` and
`whenFilled` as `col0`/`col1` would leave a merchant guessing.

### Server data goes through `extras` — never fetch in a component

Add a case to `lib/widgets/resolvePuckExtras.ts`, keyed on `props.id`, and read
it from the `extra` prop. Every case is wrapped so unresolvable settings (a
deleted collection) render nothing rather than taking the page down.

**Never cache anything cookie-scoped.** `cart_frequently_bought_together`
resolves against the visitor's own cart; a shared cache entry would serve one
shopper's cart cross-sells to another. This is a security note, not a
performance one.

### Page furniture reads `page`, not settings

Commerce components draw from `page.product.detail`, `page.cart`,
`page.listing`, `page.post`, `page.customer`. In the editor `page` is absent —
render `<CommercePlaceholder>`, never fabricated sample data. A made-up price
in a WYSIWYG canvas gets mistaken for real, and "the price is wrong in the page
builder" is a worse support burden than an obviously inert outline.

### Field types

`text` `textarea` `number` `select` `toggle` `color` `image` `json` `array`.

`toggle`, `color`, `image` and `json` have no Puck primitive and are rendered by
`lib/puck/customFields.tsx` — already wired, just use them. Dot-path keys
(`link.url`) automatically become nested object fields. `array` fields nest,
and each added item gets a fresh uuid.

### Required components

If a route cannot function without your widget, add it to
`REQUIRED_COMPONENTS` in `lib/puck/validateDocument.ts`
(`productView: ['product_add_to_cart']`). That hides delete and duplicate in the
editor **and** refuses the write and the publish server-side — the UI half is an
affordance, the server half is the guarantee.

Require the minimum. A page can legitimately omit a gallery or show price inside
a custom block; over-requiring turns a guarantee into an obstruction.

---

## Worth reading before writing

| For | Read |
| --- | --- |
| A settings-driven widget | `CouponBlock.tsx` |
| Page furniture | `commerce/ProductPrice.tsx` |
| A container with indexed slots | `Columns.tsx` |
| A container with named slots | `commerce/CartSwitch.tsx` |
| Data from the server | `CollectionProducts.tsx` + its case in `resolvePuckExtras.ts` |

## Checking your work

```bash
# type check — see the Type-checking section below for why the path matters
npm run typecheck:storefront

# both pipelines still render identically
cd tests/e2e && npx playwright test pageBuilder/specs/00-migration --project=functional
```

The editor is at `/admin/page-builder/puck/<routeId>`. First load takes ~50s on
a cold dev server — that is Vite transforming modules on demand, not your
widget.

---

## Type-checking

Run it from the repo root with the **explicit config path**:

```bash
npm run typecheck:storefront
```

Do **not** run `npx tsc -p .` from inside `src/storefront`. `npx` executes from
the nearest `package.json` — `packages/evershop/` — so `-p .` resolves that
package's tsconfig instead, and that config has `"exclude": ["src/storefront"]`.
The result is a check that reports success while examining none of this code.
That silently shipped a broken add-to-cart button; the npm script above exists
so nobody repeats it.
