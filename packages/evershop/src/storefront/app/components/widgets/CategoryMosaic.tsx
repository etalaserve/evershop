import { Link } from 'react-router';

import { AspectRatio } from '~/components/ui/aspect-ratio.js';
import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface Tile {
  id: string;
  image?: string;
  imageAlt?: string;
  label?: string;
  link?: string;
  newTab?: boolean;
}

export function CategoryMosaic({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as {
    heading?: string;
    tiles?: Tile[];
    columns?: number;
    aspect?: string;
    layout?: 'grid' | 'asymmetric';
  };
  const tiles = s.tiles ?? [];
  if (tiles.length === 0) return null;
  const columns = s.columns ?? 3;
  const asymmetric = s.layout === 'asymmetric' && (columns === 3 || columns === 4);
  const ratio = s.aspect === '1:1' ? 1 : s.aspect === '4:3' ? 4 / 3 : 3 / 4;

  return (
    <div className="space-y-4">
      {s.heading && <h2 className="text-lg font-semibold tracking-tight">{s.heading}</h2>}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {tiles.map((tile, i) => {
          const className = `group relative overflow-hidden rounded-xl bg-muted shadow-sm ${asymmetric && i === 0 ? 'col-span-2 row-span-2' : ''}`;
          const content = (
            <>
              <AspectRatio ratio={ratio}>
                {tile.image && (
                  <img
                    src={imageUrl(tile.image)}
                    alt={tile.imageAlt ?? tile.label ?? ''}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </AspectRatio>
              {tile.label && (
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-3">
                  <span className="text-sm font-medium text-white">{tile.label}</span>
                </div>
              )}
            </>
          );
          return tile.link ? (
            <Link key={tile.id} to={tile.link} target={tile.newTab ? '_blank' : undefined} className={className}>
              {content}
            </Link>
          ) : (
            <div key={tile.id} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
