import { AspectRatio } from '~/components/ui/aspect-ratio.js';
import { Badge } from '~/components/ui/badge.js';
import { Button } from '~/components/ui/button.js';
import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

type Anchor = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';

const POSITION_CLASS: Record<Anchor, string> = {
  tl: 'items-start justify-start text-left',
  tc: 'items-start justify-center text-center',
  tr: 'items-start justify-end text-right',
  ml: 'items-center justify-start text-left',
  mc: 'items-center justify-center text-center',
  mr: 'items-center justify-end text-right',
  bl: 'items-end justify-start text-left',
  bc: 'items-end justify-center text-center',
  br: 'items-end justify-end text-right'
};

interface Cta {
  label?: string;
  url?: string;
  newTab?: boolean;
  style?: 'filled' | 'outline' | 'link';
}

export function Banner({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as {
    src?: string;
    width?: number;
    height?: number;
    alt?: string;
    link?: string;
    eyebrow?: string;
    heading?: string;
    subText?: string;
    contentPosition?: Anchor;
    overlayTint?: 'none' | 'dark' | 'light' | 'gradient';
    overlayOpacity?: number;
    cta?: Cta;
    cta2?: Cta;
  };

  if (!s.src) return null;

  const ratio = s.width && s.height ? s.width / s.height : 16 / 9;
  const anchorClass = POSITION_CLASS[s.contentPosition ?? 'mc'] ?? POSITION_CLASS.mc;
  const hasCopy = !!(s.eyebrow || s.heading || s.subText || s.cta?.url || s.cta2?.url);
  const tint = s.overlayTint ?? 'none';
  const op = Number.isFinite(s.overlayOpacity) ? (s.overlayOpacity as number) : 0.3;

  const image = (
    <AspectRatio ratio={ratio} className="overflow-hidden rounded-xl bg-muted">
      <img src={imageUrl(s.src)} alt={s.alt ?? ''} className="h-full w-full object-cover" />
    </AspectRatio>
  );

  const ctaButton = (cta: Cta | undefined, key: string) =>
    cta?.url ? (
      <Button key={key} asChild variant={cta.style === 'outline' ? 'outline' : cta.style === 'link' ? 'link' : 'default'}>
        <a href={cta.url} target={cta.newTab ? '_blank' : undefined} rel={cta.newTab ? 'noreferrer' : undefined}>
          {cta.label || 'Learn more'}
        </a>
      </Button>
    ) : null;

  return (
    <div className="relative">
      {s.link && !hasCopy ? <a href={s.link}>{image}</a> : image}
      {hasCopy && (
        <div className={`absolute inset-0 flex p-6 ${anchorClass}`}>
          {tint !== 'none' && (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={
                tint === 'gradient'
                  ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,${op}) 0%, rgba(0,0,0,0) 60%)` }
                  : { backgroundColor: tint === 'dark' ? `rgba(0,0,0,${op})` : `rgba(255,255,255,${op})` }
              }
            />
          )}
          <div className="relative flex max-w-md flex-col gap-3">
            {s.eyebrow && (
              <Badge variant="secondary" className="w-fit bg-white/90 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                {s.eyebrow}
              </Badge>
            )}
            {s.heading && <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">{s.heading}</h2>}
            {s.subText && <p className="text-sm sm:text-base">{s.subText}</p>}
            {(s.cta?.url || s.cta2?.url) && (
              <div className="mt-2 flex gap-3">
                {ctaButton(s.cta, 'cta')}
                {ctaButton(s.cta2, 'cta2')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
