import { Link } from 'react-router';

import { AspectRatio } from '~/components/ui/aspect-ratio.js';
import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface SubLink {
  id: string;
  label: string;
  url?: string;
}
interface Group {
  id: string;
  image?: string;
  imageAlt?: string;
  parent: { label: string; url?: string };
  subs: SubLink[];
}

export function TieredCategories({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as {
    groups?: Group[];
    columns?: number;
    imageAspect?: string;
    showParentLink?: boolean;
  };
  const groups = s.groups ?? [];
  if (groups.length === 0) return null;
  const columns = s.columns ?? Math.min(4, groups.length);
  const ratio = s.imageAspect === '1:1' ? 1 : s.imageAspect === '4:3' ? 4 / 3 : 3 / 4;

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {groups.map((group) => (
        <div key={group.id} className="space-y-3">
          {group.image && (
            <AspectRatio ratio={ratio} className="overflow-hidden rounded-lg bg-muted">
              <img src={imageUrl(group.image)} alt={group.imageAlt ?? group.parent.label} className="h-full w-full object-cover" />
            </AspectRatio>
          )}
          {s.showParentLink !== false && group.parent.url ? (
            <Link to={group.parent.url} className="block text-sm font-semibold hover:underline">
              {group.parent.label}
            </Link>
          ) : (
            <p className="text-sm font-semibold">{group.parent.label}</p>
          )}
          <ul className="space-y-1">
            {(group.subs ?? []).map((sub) => (
              <li key={sub.id}>
                {sub.url ? (
                  <Link to={sub.url} className="text-sm text-muted-foreground hover:text-foreground">
                    {sub.label}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">{sub.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
