import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Card } from '~/components/ui/card.js';
import { Input } from '~/components/ui/input.js';
import { WIDGET_PALETTE, type PaletteEntry } from '~/lib/page-builder-admin/widgetPalette.js';

const CATEGORY_LABELS: Record<PaletteEntry['category'], string> = {
  layout: 'Layout',
  content: 'Content',
  marketing: 'Marketing',
  navigation: 'Navigation',
  commerce: 'Commerce'
};

/**
 * Drag source for adding widgets to the canvas. Uses plain native HTML5
 * drag-and-drop (not dnd-kit — dnd-kit is same-window only and can't cross
 * the iframe boundary), matching the `dataTransfer` contract
 * `AreaDropZone.tsx` already implements on the storefront side.
 *
 * Grouped by `PaletteEntry.category` (already present on the data, just
 * unused by the UI until now) and filterable by a search box, matching the
 * reference product's block-picker UX.
 */
export function Palette({ onAddClick }: { onAddClick: (variantId: string) => void }) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? WIDGET_PALETTE.filter((entry) => entry.label.toLowerCase().includes(q) || CATEGORY_LABELS[entry.category].toLowerCase().includes(q))
      : WIDGET_PALETTE;
    const groups = new Map<PaletteEntry['category'], PaletteEntry[]>();
    for (const entry of filtered) {
      const list = groups.get(entry.category) ?? [];
      list.push(entry);
      groups.set(entry.category, list);
    }
    return groups;
  }, [query]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative px-3 pt-3">
        <Search className="pointer-events-none absolute left-6 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search blocks…"
          className="pl-8"
        />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {grouped.size === 0 && <p className="px-1 text-sm text-muted-foreground">No blocks match "{query}".</p>}
        {[...grouped.entries()].map(([category, entries]) => (
          <div key={category} className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{CATEGORY_LABELS[category]}</p>
            {entries.map((entry) => (
              <Card
                key={entry.variantId}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-evershop-widget', entry.variantId);
                  e.dataTransfer.setData('text/plain', entry.variantId);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onAddClick(entry.variantId)}
                className="cursor-grab select-none px-3 py-2 text-sm hover:bg-accent active:cursor-grabbing"
                title="Drag onto the page, or click to add to the end"
              >
                {entry.label}
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
