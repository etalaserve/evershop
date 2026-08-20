import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion.js';
import { RichContent, type EditorRow } from '~/components/content/rich-content.js';
import type { WidgetComponentProps } from '~/lib/widgets/registry.js';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
interface ProseSection {
  id: string;
  type: 'prose';
  content: EditorRow[] | string;
}
interface FaqSection {
  id: string;
  type: 'faq';
  heading: string | null;
  items: FaqItem[];
}
type Section = ProseSection | FaqSection;

const MAX_WIDTH_CLASS: Record<string, string> = {
  narrow: 'max-w-[560px]',
  normal: 'max-w-[720px]',
  wide: 'max-w-none'
};

function normalizeProse(content: EditorRow[] | string): EditorRow[] {
  if (Array.isArray(content)) return content;
  if (typeof content !== 'string' || !content.trim()) return [];
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function FaqBlock({ widget }: WidgetComponentProps) {
  const s = widget.rawSettings as {
    heading?: string | null;
    sections?: Section[];
    maxWidth?: string | null;
    allowMultipleOpen?: boolean | null;
  };
  const sections = s.sections ?? [];
  if (sections.length === 0) return null;
  const widthClass = MAX_WIDTH_CLASS[s.maxWidth ?? 'normal'] ?? MAX_WIDTH_CLASS.normal;

  return (
    <div className={`evershop-faq-block mx-auto ${widthClass} py-6 md:py-10`}>
      {s.heading && <h2 className="mb-4 text-2xl font-semibold tracking-tight">{s.heading}</h2>}
      <div className="space-y-6">
        {sections.map((section) => {
          if (section.type === 'prose') {
            return (
              <div key={section.id} className="prose max-w-none">
                <RichContent rows={normalizeProse(section.content)} />
              </div>
            );
          }
          return (
            <div key={section.id}>
              {section.heading && <h3 className="mb-2 text-lg font-semibold">{section.heading}</h3>}
              {s.allowMultipleOpen === false ? (
                <Accordion type="single" collapsible className="rounded-md border border-border px-3">
                  {(section.items ?? []).map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger>{item.question}</AccordionTrigger>
                      <AccordionContent>{item.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <Accordion type="multiple" className="rounded-md border border-border px-3">
                  {(section.items ?? []).map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger>{item.question}</AccordionTrigger>
                      <AccordionContent>{item.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
