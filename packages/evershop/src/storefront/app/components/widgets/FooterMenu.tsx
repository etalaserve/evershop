import { Link } from 'react-router';

import { cn } from '~/lib/utils.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface FooterLink {
  id: string;
  label: string;
  url?: string | null;
}
interface FooterColumn {
  id: string;
  title: string;
  links: FooterLink[];
}

export function FooterMenu({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as { columns?: FooterColumn[]; variant?: 'plain' | 'card' };
  const columns = s.columns ?? [];
  if (columns.length === 0) return null;
  const isCard = s.variant === 'card';

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
      {columns.map((column) => (
        <div key={column.id} className={cn('space-y-2', isCard && 'rounded-lg border border-border p-4 shadow-sm')}>
          <h3 className="text-sm font-semibold tracking-wide">{column.title}</h3>
          <ul className="space-y-1.5">
            {(column.links ?? []).map((link) =>
              link.url ? (
                <li key={link.id}>
                  {/^https?:\/\//.test(link.url) ? (
                    <a href={link.url} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.url} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  )}
                </li>
              ) : null
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
