import { Link } from 'react-router';
import { imageUrl } from '~/lib/image.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface Extra {
  heading: string | null;
  categories: Array<{
    categoryId: number;
    uuid: string;
    name: string;
    urlKey: string;
    image: { url: string; alt: string | null } | null;
  }>;
}

/**
 * Live top-level category grid — same markup the homepage used to render
 * inline (`_index.tsx`), now widget-driven so it's editable/removable via
 * the page builder. Reads current categories from the DB on every render
 * (see `resolveWidgetExtras.ts`'s `top_categories` case), same as the
 * hardcoded version did — no manual tile authoring like `category_mosaic`.
 */
export function TopCategories({ extra }: WidgetComponentProps) {
  const data = extra as Extra | null | undefined;
  if (!data || data.categories.length === 0) return null;

  return (
    <div className="space-y-4">
      {data.heading && <h2 className="text-lg font-semibold tracking-tight">{data.heading}</h2>}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data.categories.map((category) => (
          <Link
            key={category.categoryId}
            to={`/category/${category.urlKey}`}
            className="group relative overflow-hidden rounded-lg border border-border bg-muted"
          >
            <div className="aspect-video">
              {category.image ? (
                <img
                  src={imageUrl(category.image.url)}
                  alt={category.image.alt ?? category.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : null}
            </div>
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-3">
              <span className="text-sm font-medium text-white">{category.name}</span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
