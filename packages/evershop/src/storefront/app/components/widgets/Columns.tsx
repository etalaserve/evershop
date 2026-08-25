import type { CSSProperties } from 'react';
import { WidgetArea } from './WidgetArea.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

type ColumnAnchor = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';

const ANCHOR_CLASS: Record<ColumnAnchor, string> = {
  tl: 'justify-start text-left',
  tc: 'justify-start text-center',
  tr: 'justify-start text-right',
  ml: 'justify-center text-left',
  mc: 'justify-center text-center',
  mr: 'justify-center text-right',
  bl: 'justify-end text-left',
  bc: 'justify-end text-center',
  br: 'justify-end text-right'
};

const PADDING_CLASS: Record<string, string> = {
  none: '',
  sm: 'py-3 px-3 md:py-4 md:px-4',
  md: 'py-5 px-4 md:py-7 md:px-6',
  lg: 'py-7 px-4 md:py-12 md:px-8',
  xl: 'py-10 px-4 md:py-16 md:px-12'
};

function parseRatio(ratio: string | null | undefined, fallbackCount: number): { parts: number[]; gridCols: string } {
  const raw =
    typeof ratio === 'string' && ratio.length > 0
      ? ratio
      : Array.from({ length: Math.max(1, fallbackCount) }, () => '1').join('-');
  const parts = raw.split('-').map((p) => Math.max(1, Math.min(6, Number(p) || 1)));
  return { parts, gridCols: parts.map((p) => `${p}fr`).join(' ') };
}

export function Columns({ widget, extras, slots }: WidgetComponentProps) {
  const s = widget.rawSettings as {
    columnCount?: number;
    gap?: number;
    ratio?: string | null;
    background?: string | null;
    padding?: string | null;
    contentPosition?: ColumnAnchor | null;
  };
  const safeGap = typeof s.gap === 'number' ? Math.max(0, Math.min(80, s.gap)) : 16;
  const { parts, gridCols } = parseRatio(s.ratio, s.columnCount || 2);
  const paddingClass = PADDING_CLASS[s.padding || 'none'] ?? '';
  const anchorClass = ANCHOR_CLASS[(s.contentPosition || 'mc') as ColumnAnchor] ?? ANCHOR_CLASS.mc;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html:
            '.evershop-columns__grid { grid-template-columns: 1fr; } @media (min-width: 768px) { .evershop-columns__grid { grid-template-columns: var(--evershop-columns-grid, 1fr); } }'
        }}
      />
      <div className={`evershop-columns ${paddingClass}`} style={{ backgroundColor: s.background || undefined, width: '100%' }}>
        <div
          className="evershop-columns__grid"
          style={{ display: 'grid', gap: `${safeGap}px`, width: '100%', ['--evershop-columns-grid' as string]: gridCols } as CSSProperties}
        >
          {parts.map((_, i) => (
            <div key={i} className={`evershop-columns__column flex flex-col ${anchorClass}`} style={{ position: 'relative' }}>
              {(() => {
                // Puck passes a slot component per column; the widget pipeline
                // passes data for a nested WidgetArea. See `slots` in registry.tsx.
                const Slot = slots?.[i];
                return Slot ? (
                  <Slot />
                ) : (
                  <WidgetArea areaId={`columnsContainer_${widget.uuid}_col_${i}`} widgets={widget.columns[i]?.widgets ?? []} extras={extras} />
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
