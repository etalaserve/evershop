import sanitizeHtml from 'sanitize-html';

import { imageUrl } from '~/lib/image.js';

/**
 * EverShop's block-editor content format — `Product.description` /
 * `CmsPage.content` / `BlogPost.description` all return this same JSON
 * shape: rows of columns of EditorJS-style blocks. Mirrors the block
 * vocabulary rendered by EverShop's own `components/common/Editor.tsx`
 * (paragraph/header/list/image/quote/raw); `productList` blocks are skipped
 * — cross-linking a live product query into arbitrary CMS content isn't
 * worth the complexity for this storefront.
 */
export interface EditorRow {
  size?: number;
  columns: Array<{
    size?: number;
    data?: { blocks?: EditorBlock[] };
  }>;
}

interface EditorBlock {
  type: string;
  data: Record<string, unknown>;
}

function clean(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height']
    }
  });
}

function Block({ block }: { block: EditorBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <p dangerouslySetInnerHTML={{ __html: clean(String(block.data.text ?? '')) }} />;
    case 'header': {
      const level = Number(block.data.level) || 2;
      const Tag = `h${Math.min(6, Math.max(1, level))}` as keyof React.JSX.IntrinsicElements;
      return <Tag>{String(block.data.text ?? '')}</Tag>;
    }
    case 'list': {
      const items = Array.isArray(block.data.items) ? (block.data.items as string[]) : [];
      const ListTag = block.data.style === 'ordered' ? 'ol' : 'ul';
      return (
        <ListTag>
          {items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: clean(item) }} />
          ))}
        </ListTag>
      );
    }
    case 'image': {
      const file = block.data.file as { url?: string } | undefined;
      if (!file?.url) return null;
      return (
        <figure>
          <img src={imageUrl(file.url)} alt={String(block.data.caption ?? '')} className="rounded-lg" />
          {typeof block.data.caption === 'string' && block.data.caption && (
            <figcaption className="text-sm text-muted-foreground">{block.data.caption}</figcaption>
          )}
        </figure>
      );
    }
    case 'quote':
      return (
        <blockquote>
          <p>{String(block.data.text ?? '')}</p>
          {typeof block.data.caption === 'string' && block.data.caption && (
            <cite>— {block.data.caption}</cite>
          )}
        </blockquote>
      );
    case 'raw':
      return <div dangerouslySetInnerHTML={{ __html: clean(String(block.data.html ?? '')) }} />;
    default:
      return null;
  }
}

export function RichContent({ rows }: { rows: EditorRow[] | null | undefined }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="prose prose-neutral max-w-none space-y-4">
      {rows.map((row, ri) => (
        <div
          key={ri}
          className="grid grid-cols-1 gap-5"
          style={{ gridTemplateColumns: `repeat(${row.size ?? 1}, 1fr)` }}
        >
          {row.columns.map((column, ci) => (
            <div key={ci} style={{ gridColumn: `span ${column.size ?? 1}` }} className="space-y-4">
              {(column.data?.blocks ?? []).map((block, bi) => (
                <Block key={bi} block={block} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
