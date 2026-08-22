import { imageUrl } from '~/lib/image.js';
import { cn } from '~/lib/utils.js';
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
  const isCentered = s.alignment !== 'left';
  const align = isCentered ? 'text-center items-center' : 'text-left items-start';

  return (
    <div
      className={cn('evershop-trust-strip grid gap-6 py-6', s.divider && 'divide-y sm:divide-y-0 sm:divide-x divide-border')}
      style={{ gridTemplateColumns: `repeat(${Math.min(columns, items.length)}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const body = (
          <div className={cn('flex flex-col gap-2 px-3 py-2', align)}>
            {s.showIcons !== false && item.icon && (
              <span className={cn('flex h-11 w-11 items-center justify-center rounded-full bg-muted', isCentered && 'mx-auto')}>
                <img src={imageUrl(item.icon)} alt="" className="h-5 w-5 object-contain" />
              </span>
            )}
            <p className="text-sm font-semibold">{item.title}</p>
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
