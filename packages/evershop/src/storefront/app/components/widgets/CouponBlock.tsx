import { useState } from 'react';

import { Badge } from '~/components/ui/badge.js';
import { Button } from '~/components/ui/button.js';
import { Card, CardContent } from '~/components/ui/card.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

export function CouponBlock({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as {
    variant?: 'card' | 'compact';
    eyebrow?: string;
    heading?: string;
    body?: string;
    code?: string;
    ctaLabel?: string;
    ctaLink?: string;
    ctaNewTab?: boolean;
    expires?: string;
    backgroundColor?: string;
  };
  const [copied, setCopied] = useState(false);

  if (!s.code || !s.heading) return null;
  if (s.expires && new Date(s.expires).getTime() < Date.now()) return null;

  const codeBadge = (
    <Badge
      variant="outline"
      className="cursor-pointer border-dashed px-3 py-1.5 font-mono text-sm"
      onClick={() => {
        navigator.clipboard?.writeText(s.code as string);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? 'Copied!' : s.code}
    </Badge>
  );

  const cta = s.ctaLink && (
    <Button asChild size="sm">
      <a href={s.ctaLink} target={s.ctaNewTab ? '_blank' : undefined} rel={s.ctaNewTab ? 'noreferrer' : undefined}>
        {s.ctaLabel || 'Shop now'}
      </a>
    </Button>
  );

  if (s.variant === 'compact') {
    return (
      <div
        className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm"
        style={{ backgroundColor: s.backgroundColor || undefined }}
      >
        <span className="font-medium">{s.heading}</span>
        {codeBadge}
        {cta}
      </div>
    );
  }

  return (
    <Card className="rounded-xl shadow-sm" style={{ backgroundColor: s.backgroundColor || undefined }}>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div className="space-y-1">
          {s.eyebrow && <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">{s.eyebrow}</Badge>}
          <h3 className="text-lg font-semibold">{s.heading}</h3>
          {s.body && <p className="text-sm text-muted-foreground">{s.body}</p>}
        </div>
        <div className="flex items-center gap-3">
          {codeBadge}
          {cta}
        </div>
      </CardContent>
    </Card>
  );
}
