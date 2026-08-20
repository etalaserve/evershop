import { Separator as UiSeparator } from '~/components/ui/separator.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

const SIZE_PX: Record<string, string> = {
  xs: '8px',
  sm: '16px',
  md: '32px',
  lg: '48px',
  xl: '64px'
};

export function Separator({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as { size?: string; showLine?: boolean; lineColor?: string | null };
  const height = SIZE_PX[s.size ?? 'md'] ?? SIZE_PX.md;
  return (
    <div style={{ height, display: 'flex', alignItems: 'center' }}>
      {s.showLine && <UiSeparator style={s.lineColor ? { backgroundColor: s.lineColor } : undefined} />}
    </div>
  );
}
