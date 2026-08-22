import { useEffect, useState } from 'react';

import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface Announcement {
  id: string;
  content: string;
  link?: string | null;
}

export function AnnouncementBar({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as {
    backgroundColor?: string;
    textColor?: string;
    delay?: number;
    variant?: 'static' | 'rotating';
    announcements?: Announcement[];
  };
  const items = s.announcements ?? [];
  const isRotating = s.variant === 'rotating' && items.length > 1;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isRotating) return;
    const delay = Math.max(1500, s.delay ?? 4000);
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), delay);
    return () => clearInterval(timer);
  }, [isRotating, s.delay, items.length]);

  if (items.length === 0) return null;
  const item = items[isRotating ? index % items.length : 0];

  return (
    <div
      className="w-full overflow-hidden px-4 py-2 text-center text-sm font-medium tracking-wide"
      style={{ backgroundColor: s.backgroundColor || undefined, color: s.textColor || undefined }}
    >
      <span key={item.id} className={isRotating ? 'inline-block animate-in fade-in duration-300' : 'inline-block'}>
        {item.link ? (
          <a href={item.link} className="underline-offset-2 hover:underline">
            {item.content}
          </a>
        ) : (
          <span>{item.content}</span>
        )}
      </span>
    </div>
  );
}
