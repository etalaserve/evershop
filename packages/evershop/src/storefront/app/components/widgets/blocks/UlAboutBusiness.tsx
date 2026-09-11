import {
  AboutBusiness,
  type AboutBusinessPoint,
  type AboutBusinessStat
} from '~/blocks/ui-layouts/about-business/about-business.js';
import { withBlockDefaults } from '~/lib/blocks/defaults.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

/**
 * Adapter for the ported `ui-layouts/about-business` block.
 *
 * Hand-written as the first of these; `scripts/port-to-evershop.ts` in the
 * block library will generate the rest to this shape, and the diff against
 * this file is that generator's acceptance test.
 *
 * Props are passed one by one rather than spread. A spread would forward stray
 * keys straight into the DOM, and the explicit list is what makes the
 * fieldConfig↔props contract testable — a field that no longer maps to a prop
 * shows up here rather than silently doing nothing in the editor.
 *
 * DEFAULTS is the block's own presentable content, lifted from its schema in
 * the library. It lives here rather than in the palette because palette
 * defaults are persisted on drop; see `withBlockDefaults`.
 */
const DEFAULTS = {
  eyebrow: 'Corporate Overview',
  heading: 'A legacy of leadership\nand strategic impact.',
  stats: [
    { value: '25+', label: 'Years of Trust' },
    { value: '12', label: 'Global Offices' }
  ] as AboutBusinessStat[],
  imageSrc: '',
  imageAlt: 'Corporate',
  points: [
    {
      title: 'Global Perspective',
      body: 'Leveraging international insights to solve local complexities with precision and scale.'
    },
    {
      title: 'Operational Excellence',
      body: 'Optimizing corporate structures to foster long-term resilience and shareholder value.'
    }
  ] as AboutBusinessPoint[],
  ctaLabel: 'Our Executive Team',
  ctaHref: '#'
};

export function UlAboutBusiness({ widget }: WidgetComponentProps) {
  const s = withBlockDefaults(widget.rawSettings, DEFAULTS);
  return (
    <AboutBusiness
      eyebrow={s.eyebrow}
      heading={s.heading}
      stats={s.stats}
      imageSrc={s.imageSrc}
      imageAlt={s.imageAlt}
      points={s.points}
      ctaLabel={s.ctaLabel}
      ctaHref={s.ctaHref}
    />
  );
}
