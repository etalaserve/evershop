import { RichContent, type EditorRow } from '~/components/content/rich-content.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

export function TextBlock({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as { text?: unknown; className?: string };
  let rows: EditorRow[] = [];
  if (Array.isArray(s.text)) {
    rows = s.text as EditorRow[];
  } else if (typeof s.text === 'string' && s.text) {
    try {
      rows = JSON.parse(s.text);
    } catch {
      rows = [];
    }
  }
  return (
    <div className={s.className || undefined}>
      <RichContent rows={rows} />
    </div>
  );
}
