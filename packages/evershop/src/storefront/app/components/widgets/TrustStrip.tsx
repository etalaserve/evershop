import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface TrustItem {
  id: string;
  icon?: string | null;
  title: string;
  description?: string | null;
  link?: { url: string; newTab?: boolean } | null;
}

export function TrustStrip({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as {
    items?: TrustItem[];
    columns?: number | null;
    showIcons?: boolean;
    alignment?: 'left' | 'center';
    divider?: boolean;
  };
  const items = s.items ?? [];
  if (items.length === 0) return null;
  const columns = s.columns || Math.min(4, items.length);
  const align = s.alignment === 'left' ? 'text-left items-start' : 'text-center items-center';

  return (
    <div
      className={`evershop-trust-strip grid gap-6 py-6 ${s.divider ? 'divide-y sm:divide-y-0 sm:divide-x divide-border' : ''}`}
      style={{ gridTemplateColumns: `repeat(${Math.min(columns, items.length)}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const body = (
          <div className={`flex flex-col gap-1 px-2 py-2 ${align}`}>
            {s.showIcons !== false && item.icon && (
              <img src={imageUrl(item.icon)} alt="" className="mx-auto h-8 w-8 object-contain" />
            )}
            <p className="font-medium">{item.title}</p>
            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
          </div>
        );
        return item.link?.url ? (
          <a key={item.id} href={item.link.url} target={item.link.newTab ? '_blank' : undefined} rel={item.link.newTab ? 'noreferrer' : undefined}>
            {body}
          </a>
        ) : (
          <div key={item.id}>{body}</div>
        );
      })}
    </div>
  );
}
