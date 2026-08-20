import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import type { WidgetFragment } from '~/lib/graphql/queries/widgets.js';
import { flattenWidgets } from '~/lib/page-builder-admin/widgetLookup.js';

/**
 * Widget order for the current area, built from the already-loaded widget
 * tree (not the iframe's `preview-rendered` DOM-order message) — the typed
 * tree already carries each widget's area + sortOrder, so it doesn't need
 * cross-referencing. Reordering here is same-window only (`@dnd-kit`), same
 * scoping rule as the palette-vs-canvas split: dnd-kit never needs to cross
 * the iframe boundary because this list doesn't touch the iframe DOM
 * directly — it only computes a new `sortOrder` and posts a move op, same
 * as the canvas's own move-up/down buttons do.
 */
export function Layers({
  widgets,
  areaId,
  selectedUid,
  onSelect,
  onHover,
  onReorder
}: {
  widgets: WidgetFragment[];
  areaId: string;
  selectedUid: string | null;
  onSelect: (widget: WidgetFragment) => void;
  onHover: (widgetUid: string | null) => void;
  onReorder: (widgetUid: string, oldSortOrder: number, newSortOrder: number) => void;
}) {
  const items = flattenWidgets(widgets)
    .map((w) => ({ widget: w, placement: w.placements.find((p) => p.area === areaId) }))
    .filter((entry): entry is { widget: WidgetFragment; placement: NonNullable<typeof entry.placement> } => !!entry.placement)
    .sort((a, b) => a.placement.sortOrder - b.placement.sortOrder);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = items.findIndex((i) => i.widget.uuid === active.id);
    const toIndex = items.findIndex((i) => i.widget.uuid === over.id);
    if (fromIndex === -1 || toIndex === -1) return;

    const moved = items[fromIndex];
    const reordered = arrayMove(items, fromIndex, toIndex);
    const newIndex = reordered.indexOf(moved);
    const before = reordered[newIndex - 1]?.placement.sortOrder;
    const after = reordered[newIndex + 1]?.placement.sortOrder;
    const newSortOrder = before != null && after != null ? (before + after) / 2 : before != null ? before + 100 : after != null ? after - 50 : 100;

    onReorder(moved.widget.uuid, moved.placement.sortOrder, newSortOrder);
  }

  if (items.length === 0) {
    return <p className="p-3 text-sm text-muted-foreground">No widgets on this page yet.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.widget.uuid)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1 p-2">
          {items.map(({ widget }) => (
            <LayerRow
              key={widget.uuid}
              widget={widget}
              selected={widget.uuid === selectedUid}
              onSelect={() => onSelect(widget)}
              onHover={onHover}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function LayerRow({
  widget,
  selected,
  onSelect,
  onHover
}: {
  widget: WidgetFragment;
  selected: boolean;
  onSelect: () => void;
  onHover: (widgetUid: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.uuid });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm ${selected ? 'border-primary bg-accent' : 'border-transparent hover:bg-accent/50'}`}
      onMouseEnter={() => onHover(widget.uuid)}
      onMouseLeave={() => onHover(null)}
    >
      <button type="button" className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="flex-1 truncate text-left" onClick={onSelect}>
        {widget.type}
      </button>
    </li>
  );
}
