import { useState } from 'react';

import { Badge } from '~/components/ui/badge.js';
import { Button } from '~/components/ui/button.js';
import { Card, CardContent } from '~/components/ui/card.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

export function CouponBlock({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as {
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

  return (
    <Card style={{ backgroundColor: s.backgroundColor || undefined }}>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div className="space-y-1">
          {s.eyebrow && <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.eyebrow}</span>}
          <h3 className="text-lg font-semibold">{s.heading}</h3>
          {s.body && <p className="text-sm text-muted-foreground">{s.body}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="cursor-pointer px-3 py-1.5 font-mono text-sm"
            onClick={() => {
              navigator.clipboard?.writeText(s.code as string);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? 'Copied!' : s.code}
          </Badge>
          {s.ctaLink && (
            <Button asChild>
              <a href={s.ctaLink} target={s.ctaNewTab ? '_blank' : undefined} rel={s.ctaNewTab ? 'noreferrer' : undefined}>
                {s.ctaLabel || 'Shop now'}
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
