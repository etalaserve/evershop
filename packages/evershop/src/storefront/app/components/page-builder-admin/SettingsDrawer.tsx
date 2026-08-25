import { useEffect, useState } from 'react';
import { SettingsForm } from './SettingsForm.js';
import { Button } from '~/components/ui/button.js';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '~/components/ui/sheet.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs.js';
import { Textarea } from '~/components/ui/textarea.js';
import { WIDGET_FIELD_CONFIGS } from '~/lib/page-builder-admin/fieldConfig.js';

export interface SelectedWidget {
  widgetUid: string;
  widgetType: string;
  settings: Record<string, unknown>;
}

/**
 * Phase B: a real field-config-driven form (`SettingsForm`) for the 16
 * widget types with a config in `fieldConfig.ts`, with a "Raw JSON" tab
 * always available as an escape hatch — for `text_block` (EditorJS content,
 * not config-driven) and for anything the structured form doesn't cover.
 * Both tabs edit the SAME in-memory settings object, kept in sync on tab
 * switch so neither view can silently clobber the other's edits.
 */
export function SettingsDrawer({
  widget,
  isBusy = false,
  onClose,
  onSave
}: {
  widget: SelectedWidget | null;
  /** Disables Save while a mutation is in flight — without it a double-click queues duplicate operations into the changeset. */
  isBusy?: boolean;
  onClose: () => void;
  onSave: (newSettings: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [tab, setTab] = useState<'form' | 'json'>('form');

  const widgetUid = widget?.widgetUid;
  useEffect(() => {
    if (widget) {
      setValues(widget.settings);
      setJsonText(JSON.stringify(widget.settings, null, 2));
      setJsonError(null);
      setTab(WIDGET_FIELD_CONFIGS[widget.widgetType] ? 'form' : 'json');
    }
    // Keyed on the widget's IDENTITY, not the `widget` object. The drawer now
    // stays open across saves and the caller advances its settings baseline by
    // recreating that object; re-seeding on every new object identity would
    // discard edits the user typed while a save was still in flight.
  }, [widgetUid]);

  const fields = widget ? WIDGET_FIELD_CONFIGS[widget.widgetType] : undefined;

  return (
    <Sheet open={!!widget} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{widget?.widgetType ?? 'Widget'} settings</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-auto px-4">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = v as 'form' | 'json';
              // Sync the OTHER view's edits before switching, so neither tab
              // silently loses what the user just typed in the one they're leaving.
              if (next === 'json') setJsonText(JSON.stringify(values, null, 2));
              else {
                try {
                  setValues(JSON.parse(jsonText));
                } catch {
                  // keep prior structured values if the JSON is currently invalid
                }
              }
              setTab(next);
            }}
          >
            <TabsList>
              <TabsTrigger value="form" disabled={!fields}>
                Form
              </TabsTrigger>
              <TabsTrigger value="json">Raw JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="form" className="pt-3">
              {fields ? (
                <SettingsForm fields={fields} values={values} onChange={setValues} />
              ) : (
                <p className="text-sm text-muted-foreground">No structured form for this widget type — use Raw JSON.</p>
              )}
            </TabsContent>
            <TabsContent value="json" className="pt-3">
              <Textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="min-h-64 font-mono text-xs"
                spellCheck={false}
              />
              {jsonError && <p className="mt-2 text-sm text-destructive">{jsonError}</p>}
            </TabsContent>
          </Tabs>
        </div>
        <SheetFooter>
          <Button
            disabled={isBusy}
            onClick={() => {
              if (tab === 'json') {
                try {
                  const parsed = JSON.parse(jsonText);
                  setJsonError(null);
                  onSave(parsed);
                } catch {
                  setJsonError('Invalid JSON');
                }
              } else {
                onSave(values);
              }
            }}
          >
            {isBusy ? 'Saving…' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
