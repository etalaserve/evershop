import { Card } from '~/components/ui/card.js';
import { WIDGET_PALETTE } from '~/lib/page-builder-admin/widgetPalette.js';

/**
 * Drag source for adding widgets to the canvas. Uses plain native HTML5
 * drag-and-drop (not dnd-kit — dnd-kit is same-window only and can't cross
 * the iframe boundary), matching the `dataTransfer` contract
 * `AreaDropZone.tsx` already implements on the storefront side.
 */
export function Palette({ onAddClick }: { onAddClick: (type: string) => void }) {
  return (
    <div className="space-y-2 p-3">
      {WIDGET_PALETTE.map((entry) => (
        <Card
          key={entry.type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-evershop-widget', entry.type);
            e.dataTransfer.setData('text/plain', entry.type);
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => onAddClick(entry.type)}
          className="cursor-grab select-none px-3 py-2 text-sm hover:bg-accent active:cursor-grabbing"
          title="Drag onto the page, or click to add to the end"
        >
          {entry.label}
        </Card>
      ))}
    </div>
  );
}
