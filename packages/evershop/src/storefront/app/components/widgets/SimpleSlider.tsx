import { useEffect, useState } from 'react';

import { AspectRatio } from '~/components/ui/aspect-ratio.js';
import { Button } from '~/components/ui/button.js';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '~/components/ui/carousel.js';
import { imageUrl } from '~/lib/image.js';
import { cn } from '~/lib/utils.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface Slide {
  id: string;
  image: string;
  headline?: string;
  subText?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonStyle?: 'filled' | 'outline' | 'link';
  width?: number;
  height?: number;
  eyebrow?: string;
  contentPosition?: string;
  overlayTint?: 'none' | 'dark' | 'light' | 'gradient';
  overlayOpacity?: number;
  wholeSlideLink?: boolean;
  hidden?: boolean;
}

const ASPECT_RATIO: Record<string, number> = {
  auto: 16 / 9,
  '16:9': 16 / 9,
  '21:9': 21 / 9,
  '4:3': 4 / 3,
  '1:1': 1
};

export function SimpleSlider({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as {
    slides?: Slide[];
    arrows?: boolean;
    dots?: boolean;
    aspectRatio?: string;
  };
  const slides = (s.slides ?? []).filter((slide) => !slide.hidden && slide.image);
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!api) return;
    setSelected(api.selectedScrollSnap());
    const onSelect = () => setSelected(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  if (slides.length === 0) return null;
  const ratio = ASPECT_RATIO[s.aspectRatio ?? 'auto'] ?? ASPECT_RATIO.auto;
  const showDots = s.dots !== false && slides.length > 1;

  return (
    <div className="relative">
      <Carousel className="w-full" opts={{ loop: slides.length > 1 }} setApi={setApi}>
        <CarouselContent>
          {slides.map((slide) => {
            const tint = slide.overlayTint ?? 'none';
            const op = Number.isFinite(slide.overlayOpacity) ? (slide.overlayOpacity as number) : 0.3;
            const body = (
              <div className="relative">
                <AspectRatio ratio={ratio} className="overflow-hidden rounded-xl bg-muted">
                  <img src={imageUrl(slide.image)} alt={slide.headline ?? ''} className="h-full w-full object-cover" />
                </AspectRatio>
                {(slide.headline || slide.subText || slide.buttonText) && (
                  <div className="absolute inset-0 flex flex-col items-start justify-end gap-2 p-6 text-left">
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
                    <div className="relative max-w-md space-y-1">
                      {slide.eyebrow && <span className="text-sm font-medium uppercase tracking-wide">{slide.eyebrow}</span>}
                      {slide.headline && <h2 className="text-2xl font-semibold sm:text-3xl">{slide.headline}</h2>}
                      {slide.subText && <p className="text-sm">{slide.subText}</p>}
                      {slide.buttonText && slide.buttonLink && !slide.wholeSlideLink && (
                        <Button asChild className="mt-2" variant={slide.buttonStyle === 'outline' ? 'outline' : slide.buttonStyle === 'link' ? 'link' : 'default'}>
                          <a href={slide.buttonLink}>{slide.buttonText}</a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
            return (
              <CarouselItem key={slide.id}>
                {slide.wholeSlideLink && slide.buttonLink ? <a href={slide.buttonLink}>{body}</a> : body}
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {s.arrows !== false && slides.length > 1 && (
          <>
            <CarouselPrevious />
            <CarouselNext />
          </>
        )}
      </Carousel>
      {showDots && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => api?.scrollTo(i)}
              className={cn('h-1.5 rounded-full transition-all', i === selected ? 'w-5 bg-foreground' : 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
