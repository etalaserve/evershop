import { Button } from '~/components/ui/button.js';
import { Card } from '~/components/ui/card.js';
import { Multiline } from '~/lib/blocks/text.js';
import { TEXT_STYLES } from '~/lib/blocks/text-styles.js';

/**
 * Ported from the block library (`ui-layouts/about-business`).
 *
 * Restyled onto this project's primitives: `@workspace/ui` → `~/components/ui`,
 * the library's `cn-*` text roles → the flattened `TEXT_STYLES`, and Base UI's
 * `render` prop → Radix's `asChild`. The decorative `bg-zinc-50` disc became
 * `bg-muted` so it tracks a merchant's theme instead of staying near-white on
 * a dark one.
 */

export interface AboutBusinessStat {
  value: string;
  label: string;
}

export interface AboutBusinessPoint {
  title: string;
  body: string;
}

export interface AboutBusinessProps {
  eyebrow?: string;
  heading?: string;
  stats?: AboutBusinessStat[];
  imageSrc?: string;
  imageAlt?: string;
  points?: AboutBusinessPoint[];
  ctaLabel?: string;
  ctaHref?: string;
}

export function AboutBusiness({
  eyebrow,
  heading,
  stats = [],
  imageSrc,
  imageAlt,
  points = [],
  ctaLabel,
  ctaHref
}: AboutBusinessProps) {
  return (
    <section className="bg-background text-foreground px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-24 lg:grid-cols-2">
          <div className="relative order-2 lg:order-1">
            <div className="bg-muted absolute -top-12 -left-12 -z-10 size-48 rounded-full" />
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <Card
                  key={i}
                  className={`flex aspect-square items-center justify-center border-none p-8 ${
                    i === 0 ? 'bg-foreground text-background' : 'bg-muted'
                  }`}
                >
                  <div className={`text-center ${i === 0 ? '' : 'text-foreground'}`}>
                    <div className={TEXT_STYLES.statLg}>{stat.value}</div>
                    <div
                      className={`${TEXT_STYLES.eyebrow} mt-2 ${
                        i === 0 ? 'text-background/60' : ''
                      }`}
                    >
                      {stat.label}
                    </div>
                  </div>
                </Card>
              ))}
              {imageSrc && (
                <Card className="col-span-2 aspect-2/1 overflow-hidden">
                  <img src={imageSrc} className="size-full object-cover" alt={imageAlt ?? ''} />
                </Card>
              )}
            </div>
          </div>

          <div className="order-1 space-y-10 lg:order-2">
            <div className="space-y-2">
              {eyebrow && <span className={TEXT_STYLES.eyebrow}>{eyebrow}</span>}
              <h2 className={`${TEXT_STYLES.h2} border-none leading-tight`}>
                <Multiline>{heading}</Multiline>
              </h2>
            </div>
            <div className="space-y-6">
              {points.map((point, i) => (
                <div key={i} className="flex gap-4">
                  <div
                    className={`mt-1 size-6 shrink-0 ${
                      i === 0 ? 'bg-foreground' : 'bg-muted-foreground/30'
                    }`}
                  />
                  <div>
                    <h3 className={`${TEXT_STYLES.h3} mb-2 text-pretty`}>{point.title}</h3>
                    <p className={`${TEXT_STYLES.muted} text-pretty leading-relaxed`}>
                      {point.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {ctaLabel && (
              <div className="pt-6">
                <Button
                  asChild
                  className="h-14 px-10 text-xs font-black tracking-widest uppercase shadow-xl transition-transform duration-200 hover:translate-y-[-2px]"
                >
                  <a href={ctaHref || '#'}>{ctaLabel}</a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
