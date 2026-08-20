import { AspectRatio } from '~/components/ui/aspect-ratio.js';
import { Button } from '~/components/ui/button.js';
import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface Cta {
  label?: string;
  url?: string;
  newTab?: boolean;
  style?: 'filled' | 'outline' | 'link';
}

export function SplitFeature({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as {
    image?: string;
    imageAlt?: string;
    imagePosition?: 'left' | 'right';
    width?: number;
    height?: number;
    eyebrow?: string;
    heading?: string;
    body?: string;
    cta?: Cta;
    verticalAlign?: 'top' | 'center' | 'bottom';
    imageFit?: 'cover' | 'contain';
  };
  if (!s.image || !s.heading) return null;
  const ratio = s.width && s.height ? s.width / s.height : 4 / 3;
  const alignClass = s.verticalAlign === 'top' ? 'items-start' : s.verticalAlign === 'bottom' ? 'items-end' : 'items-center';

  const image = (
    <AspectRatio ratio={ratio} className="overflow-hidden rounded-lg bg-muted">
      <img
        src={imageUrl(s.image)}
        alt={s.imageAlt ?? ''}
        className={`h-full w-full ${s.imageFit === 'contain' ? 'object-contain' : 'object-cover'}`}
      />
    </AspectRatio>
  );

  const copy = (
    <div className="flex flex-col gap-3">
      {s.eyebrow && <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.eyebrow}</span>}
      <h2 className="text-2xl font-semibold sm:text-3xl">{s.heading}</h2>
      {s.body && <p className="text-muted-foreground">{s.body}</p>}
      {s.cta?.url && (
        <Button asChild className="mt-2 w-fit" variant={s.cta.style === 'outline' ? 'outline' : s.cta.style === 'link' ? 'link' : 'default'}>
          <a href={s.cta.url} target={s.cta.newTab ? '_blank' : undefined} rel={s.cta.newTab ? 'noreferrer' : undefined}>
            {s.cta.label || 'Learn more'}
          </a>
        </Button>
      )}
    </div>
  );

  return (
    <div className={`grid gap-8 py-8 md:grid-cols-2 ${alignClass}`}>
      {s.imagePosition === 'right' ? (
        <>
          {copy}
          {image}
        </>
      ) : (
        <>
          {image}
          {copy}
        </>
      )}
    </div>
  );
}
