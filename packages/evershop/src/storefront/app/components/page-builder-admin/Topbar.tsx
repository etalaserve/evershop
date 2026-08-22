import { Laptop, Paintbrush, Redo2, Shuffle as ShuffleIcon, Smartphone, Tablet, Trash2, Undo2 } from 'lucide-react';

import { Button } from '~/components/ui/button.js';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export function Topbar({
  routeName,
  canUndo,
  canRedo,
  isBusy,
  globalsView,
  deviceMode,
  onUndo,
  onRedo,
  onShuffle,
  onClear,
  onPublish,
  onDiscard,
  onToggleGlobalsView,
  onDeviceModeChange,
  onScheduleRollout,
  onOpenTheme
}: {
  routeName: string;
  canUndo: boolean;
  canRedo: boolean;
  isBusy: boolean;
  globalsView: boolean;
  deviceMode: DeviceMode;
  onUndo: () => void;
  onRedo: () => void;
  onShuffle: () => void;
  onClear: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  onToggleGlobalsView: () => void;
  onDeviceModeChange: (mode: DeviceMode) => void;
  onScheduleRollout: () => void;
  onOpenTheme: () => void;
}) {
  return (
    // Plain div, not `<header>` — the editor route's `header, footer { display:
    // none }` rule (hides the storefront chrome that `root.tsx` would
    // otherwise wrap every route in, page-builder included) would hide this
    // toolbar too if it were a real `<header>` element.
    <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-2">
      <span className="text-sm font-medium">{routeName}</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled={!canUndo || isBusy} onClick={onUndo} title="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" disabled={!canRedo || isBusy} onClick={onRedo} title="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>
      <Button variant={globalsView ? 'secondary' : 'ghost'} size="sm" onClick={onToggleGlobalsView}>
        Globals
      </Button>
      <Button variant="ghost" size="sm" onClick={onOpenTheme} title="Edit the site's color theme">
        <Paintbrush className="mr-1.5 h-3.5 w-3.5" />
        Theme
      </Button>
      <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
        <Button variant={deviceMode === 'desktop' ? 'secondary' : 'ghost'} size="icon" onClick={() => onDeviceModeChange('desktop')} title="Desktop">
          <Laptop className="h-4 w-4" />
        </Button>
        <Button variant={deviceMode === 'tablet' ? 'secondary' : 'ghost'} size="icon" onClick={() => onDeviceModeChange('tablet')} title="Tablet">
          <Tablet className="h-4 w-4" />
        </Button>
        <Button variant={deviceMode === 'mobile' ? 'secondary' : 'ghost'} size="icon" onClick={() => onDeviceModeChange('mobile')} title="Mobile">
          <Smartphone className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="outline" size="sm" disabled={isBusy} onClick={onShuffle} title="Replace the page with a random composition">
        <ShuffleIcon className="mr-1.5 h-3.5 w-3.5" />
        Shuffle
      </Button>
      <Button variant="outline" size="sm" disabled={isBusy} onClick={onClear} title="Remove every widget on this page">
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Clear
      </Button>
      <div className="flex-1" />
      <Button variant="outline" size="sm" disabled={isBusy} onClick={onScheduleRollout}>
        Schedule rollout
      </Button>
      <Button variant="outline" size="sm" disabled={isBusy} onClick={onDiscard}>
        Discard
      </Button>
      <Button size="sm" disabled={isBusy} onClick={onPublish}>
        Publish
      </Button>
    </div>
  );
}
