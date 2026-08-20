import { Link } from 'react-router';

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
  const s = widget.rawSettings as { columns?: FooterColumn[] };
  const columns = s.columns ?? [];
  if (columns.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
      {columns.map((column) => (
        <div key={column.id} className="space-y-2">
          <h3 className="text-sm font-semibold">{column.title}</h3>
          <ul className="space-y-1.5">
            {(column.links ?? []).map((link) =>
              link.url ? (
                <li key={link.id}>
                  {/^https?:\/\//.test(link.url) ? (
                    <a href={link.url} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.url} className="text-sm text-muted-foreground hover:text-foreground">
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
