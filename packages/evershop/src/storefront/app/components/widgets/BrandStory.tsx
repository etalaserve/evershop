import { Button } from '~/components/ui/button.js';
import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface LinkData {
  label?: string;
  url?: string;
}

export function BrandStory({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as {
    layout?: 'image-left' | 'image-right' | 'centered' | 'pull-quote';
    image?: string | null;
    imageAlt?: string;
    eyebrow?: string;
    heading?: string;
    body?: string;
    bodySecondary?: string;
    link?: LinkData;
    pullQuote?: string;
    imageSize?: number;
  };
  if (!s.heading || !s.body) return null;
  const layout = s.layout ?? 'image-right';

  const copy = (
    <div className="flex flex-col justify-center gap-3">
      {s.eyebrow && <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.eyebrow}</span>}
      <h2 className="text-2xl font-semibold sm:text-3xl">{s.heading}</h2>
      <p className="text-muted-foreground">{s.body}</p>
      {s.bodySecondary && <p className="text-muted-foreground">{s.bodySecondary}</p>}
      {layout === 'pull-quote' && s.pullQuote && (
        <blockquote className="border-l-2 border-primary pl-4 text-lg italic">{s.pullQuote}</blockquote>
      )}
      {s.link?.url && (
        <Button asChild variant="outline" className="mt-2 w-fit">
          <a href={s.link.url}>{s.link.label || 'Read more'}</a>
        </Button>
      )}
    </div>
  );

  if (layout === 'pull-quote' || layout === 'centered' || !s.image) {
    return <div className="mx-auto max-w-2xl space-y-3 py-8 text-center">{copy}</div>;
  }

  const image = (
    <div className="overflow-hidden rounded-lg bg-muted">
      <img src={imageUrl(s.image)} alt={s.imageAlt ?? ''} className="h-full w-full object-cover" />
    </div>
  );

  return (
    <div className={`grid items-center gap-8 py-8 md:grid-cols-2 ${layout === 'image-left' ? 'md:[&>*:first-child]:order-2' : ''}`}>
      {image}
      {copy}
    </div>
  );
}
