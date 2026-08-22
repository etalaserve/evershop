import { useEffect, useRef, useState } from 'react';

import { Button } from '~/components/ui/button.js';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '~/components/ui/sheet.js';
import { Textarea } from '~/components/ui/textarea.js';
import { parseShadcnThemeCss } from '~/lib/theme/tokens.js';

const PREVIEW_DEBOUNCE_MS = 250;

/**
 * Paste-a-shadcn-theme editor, live-previewed against the real canvas
 * iframe (not a mockup — see `PageBuilderBridge.tsx`'s `theme-preview`
 * handler), with an explicit Apply step that persists globally.
 */
export function ThemeSheet({
  open,
  onOpenChange,
  isBusy,
  onPreview,
  onApply
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isBusy: boolean;
  onPreview: (light: string, dark: string) => void;
  onApply: (light: string, dark: string) => void;
}) {
  const [text, setText] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const { light, dark } = parseShadcnThemeCss(value);
      onPreview(light, dark);
    }, PREVIEW_DEBOUNCE_MS);
  }

  function handleApply() {
    const { light, dark } = parseShadcnThemeCss(text);
    onApply(light, dark);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Theme</SheetTitle>
          <SheetDescription>
            Paste a full shadcn theme snippet — a <code>:root {'{ ... }'}</code> block and, optionally, a{' '}
            <code>.dark {'{ ... }'}</code> block. Changes preview live on the canvas as you type; nothing is saved until you click Apply.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-auto px-4">
          <Textarea
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={':root {\n  --primary: oklch(0.205 0 0);\n  ...\n}\n\n.dark {\n  --primary: oklch(0.922 0 0);\n  ...\n}'}
            className="min-h-96 font-mono text-xs"
            spellCheck={false}
          />
        </div>
        <SheetFooter>
          <Button disabled={isBusy || !text.trim()} onClick={handleApply}>
            Apply to whole store
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
