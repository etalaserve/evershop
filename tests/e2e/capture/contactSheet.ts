/**
 * Builds `captures/index.html` — the artifact a person actually reviews.
 *
 * The automated checks in checks.ts catch what a machine can catch. Whether
 * a layout reads well, whether an empty state is helpful, whether the
 * page-builder editor is usable at 390px — those need eyes, and eyes need
 * every viewport of a route side by side rather than a directory of 200 PNGs.
 *
 * Run after a capture:  npx tsx capture/contactSheet.ts
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAPTURES = path.join(__dirname, '../captures');

const VIEWPORTS = ['desktop', 'tablet', 'mobile'] as const;

interface Row {
  state: string;
  route: string;
  shots: Partial<Record<(typeof VIEWPORTS)[number], string>>;
}

function collect(): Row[] {
  if (!existsSync(CAPTURES)) return [];
  const byKey = new Map<string, Row>();

  for (const state of readdirSync(CAPTURES)) {
    const stateDir = path.join(CAPTURES, state);
    if (!existsSync(stateDir) || !readdirSync(stateDir).length) continue;

    for (const viewport of VIEWPORTS) {
      const dir = path.join(stateDir, viewport);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir)) {
        if (!file.endsWith('.png')) continue;
        const route = file.replace(/\.png$/, '');
        const key = `${state}/${route}`;
        const row = byKey.get(key) ?? { state, route, shots: {} };
        row.shots[viewport] = `${state}/${viewport}/${file}`;
        byKey.set(key, row);
      }
    }
  }

  return [...byKey.values()].sort(
    (a, b) => a.state.localeCompare(b.state) || a.route.localeCompare(b.route)
  );
}

function render(rows: Row[]): string {
  const states = [...new Set(rows.map((r) => r.state))];

  const sections = states
    .map((state) => {
      const cells = rows
        .filter((r) => r.state === state)
        .map((r) => {
          const shots = VIEWPORTS.map((v) => {
            const src = r.shots[v];
            return src
              ? `<figure><figcaption>${v}</figcaption><a href="${src}" target="_blank"><img loading="lazy" src="${src}" alt="${r.route} at ${v}"></a></figure>`
              : `<figure class="missing"><figcaption>${v}</figcaption><div>not captured</div></figure>`;
          }).join('');
          return `<section class="route"><h3>/${r.route === 'home' ? '' : r.route.replace(/-/g, '/')}</h3><div class="shots">${shots}</div></section>`;
        })
        .join('');
      return `<h2>${state}</h2>${cells}`;
    })
    .join('');

  return `<title>EverShop capture contact sheet</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 14px/1.5 system-ui, sans-serif; margin: 2rem; }
  h1 { margin-bottom: .25rem; }
  .meta { opacity: .7; margin-bottom: 2rem; }
  h2 { margin-top: 2.5rem; text-transform: uppercase; letter-spacing: .08em; font-size: .8rem; opacity: .6; }
  .route { border-top: 1px solid color-mix(in oklab, currentColor 15%, transparent); padding: 1rem 0; }
  .route h3 { margin: 0 0 .75rem; font-family: ui-monospace, monospace; font-size: .95rem; }
  .shots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; align-items: start; }
  figure { margin: 0; }
  figcaption { font-size: .7rem; opacity: .6; margin-bottom: .35rem; text-transform: uppercase; letter-spacing: .06em; }
  img { width: 100%; border: 1px solid color-mix(in oklab, currentColor 20%, transparent); border-radius: 6px; display: block; }
  .missing div { border: 1px dashed color-mix(in oklab, currentColor 25%, transparent); border-radius: 6px; padding: 2rem; text-align: center; opacity: .45; font-size: .8rem; }
</style>
<h1>Capture contact sheet</h1>
<p class="meta">${rows.length} routes &middot; generated ${new Date().toISOString()}<br>
Automated checks (console errors, failed requests, horizontal overflow, broken images, placeholder text)
run as assertions in the suite — a route present here passed them. This sheet is for the judgement
calls a machine can't make.</p>
${sections}
`;
}

const rows = collect();
writeFileSync(path.join(CAPTURES, 'index.html'), render(rows), 'utf8');
console.log(`contact sheet: ${rows.length} routes -> captures/index.html`);
