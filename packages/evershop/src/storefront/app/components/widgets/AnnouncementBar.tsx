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
    announcements?: Announcement[];
  };
  const items = s.announcements ?? [];
  if (items.length === 0) return null;
  // Simplification: shows the first announcement only — the legacy
  // client-side rotation through multiple messages isn't ported.
  const item = items[0];

  return (
    <div
      className="w-full overflow-hidden py-2 text-center text-sm"
      style={{ backgroundColor: s.backgroundColor || undefined, color: s.textColor || undefined }}
    >
      {item.link ? (
        <a href={item.link} className="underline-offset-2 hover:underline">
          {item.content}
        </a>
      ) : (
        <span>{item.content}</span>
      )}
    </div>
  );
}
