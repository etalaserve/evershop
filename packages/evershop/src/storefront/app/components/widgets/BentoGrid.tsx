import { Link } from 'react-router';

import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface Tile {
  id: string;
  image?: string;
  imageAlt?: string;
  backgroundColor?: string;
  eyebrow?: string;
  heading?: string;
  body?: string;
  link?: string;
  textColor?: string;
  size?: 'hero' | 'normal';
}

export function BentoGrid({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as { tiles?: Tile[]; gap?: string; minHeight?: number };
  const tiles = (s.tiles ?? []).slice(0, 5);
  if (tiles.length === 0) return null;
  const [hero, ...rest] = tiles;
  const minHeight = s.minHeight ?? 200;
  const gapClass = s.gap === 'lg' ? 'gap-6' : s.gap === 'sm' ? 'gap-2' : 'gap-4';

  function TileBody({ tile }: { tile: Tile }) {
    const content = (
      <div
        className="relative flex h-full flex-col justify-end overflow-hidden rounded-lg p-5"
        style={{ backgroundColor: tile.backgroundColor || undefined, minHeight, color: tile.textColor || undefined }}
      >
        {tile.image && (
          <img src={imageUrl(tile.image)} alt={tile.imageAlt ?? ''} className="absolute inset-0 h-full w-full object-cover" />
        )}
        {(tile.eyebrow || tile.heading || tile.body) && (
          <div className="relative space-y-1">
            {tile.eyebrow && <span className="text-xs font-medium uppercase tracking-wide">{tile.eyebrow}</span>}
            {tile.heading && <h3 className="text-lg font-semibold">{tile.heading}</h3>}
            {tile.body && <p className="text-sm opacity-90">{tile.body}</p>}
          </div>
        )}
      </div>
    );
    return tile.link ? (
      <Link to={tile.link} className="block h-full">
        {content}
      </Link>
    ) : (
      content
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${gapClass}`}>
      <div className="sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-2">
        <TileBody tile={hero} />
      </div>
      {rest.map((tile) => (
        <div key={tile.id}>
          <TileBody tile={tile} />
        </div>
      ))}
    </div>
  );
}
