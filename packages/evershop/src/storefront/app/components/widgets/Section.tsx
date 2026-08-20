import type { CSSProperties } from 'react';

import { WidgetArea } from './WidgetArea.js';
import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

type SectionWidth = 'wide' | 'boxed';
type SectionTint = 'none' | 'dark' | 'light' | 'gradient';

const PADDING_CLASS: Record<string, string> = {
  none: '',
  sm: 'py-3 px-3 md:py-4 md:px-4',
  md: 'py-5 px-4 md:py-7 md:px-6',
  lg: 'py-7 px-4 md:py-12 md:px-8',
  xl: 'py-10 px-4 md:py-16 md:px-12'
};

const WIDTH_CLASS: Record<SectionWidth, string> = {
  wide: 'relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen',
  boxed: 'relative w-full max-w-[1200px] mx-auto'
};

export function Section({ widget, extras }: WidgetComponentProps) {
  const s = widget.rawSettings as {
    width?: SectionWidth;
    padding?: string;
    background?: string | null;
    backgroundImage?: string | null;
    overlayTint?: SectionTint;
    overlayOpacity?: number;
  };
  const widthClass = WIDTH_CLASS[s.width ?? 'boxed'] ?? WIDTH_CLASS.boxed;
  const paddingClass = PADDING_CLASS[s.padding ?? 'md'] ?? PADDING_CLASS.md;
  const hasImage = !!s.backgroundImage;
  const tint = s.overlayTint ?? 'none';
  const op = Number.isFinite(s.overlayOpacity) ? (s.overlayOpacity as number) : 0.3;

  const scrimStyle: CSSProperties = { pointerEvents: 'none' };
  if (tint === 'dark') scrimStyle.backgroundColor = `rgba(0, 0, 0, ${op})`;
  else if (tint === 'light') scrimStyle.backgroundColor = `rgba(255, 255, 255, ${op})`;
  else if (tint === 'gradient') scrimStyle.backgroundImage = `linear-gradient(to top, rgba(0, 0, 0, ${op}) 0%, rgba(0, 0, 0, 0) 60%)`;

  return (
    <div className={`evershop-section overflow-hidden ${widthClass}`} style={{ backgroundColor: s.background || undefined }}>
      {hasImage && (
        <img
          src={imageUrl(s.backgroundImage as string)}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {hasImage && tint !== 'none' && op > 0 && (
        <div aria-hidden="true" className="absolute inset-0" style={scrimStyle} />
      )}
      <div className={`evershop-section__inner relative ${paddingClass}`}>
        <WidgetArea areaId={`columnsContainer_${widget.uuid}_col_0`} widgets={widget.columns[0]?.widgets ?? []} extras={extras} />
      </div>
    </div>
  );
}
