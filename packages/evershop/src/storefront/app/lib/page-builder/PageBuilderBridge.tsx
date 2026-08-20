import { useEffect, useRef } from 'react';

import { isInPageBuilderIframe, markPageBuilderActive } from './pageBuilderMode.js';
import { usePreviewWidgets, type PreviewWidget } from './PreviewContext.js';
import { ensureChromeStyleInjected } from './WidgetChrome.js';

/**
 * Listens for `data-update` postMessages from the admin window and applies
 * them to `PreviewContext` (see that file for why this is narrower than the
 * legacy bridge's full AppStateContext replacement — widgets only, since
 * this storefront's non-widget content isn't Area/propsMap-driven).
 * Race-safe via monotonic `sequence` numbers, same as the original.
 *
 * Renders nothing. Mount once near the top of the app tree (root.tsx) so
 * it's always alive in page-builder mode.
 */

interface DataUpdateMessage {
  type: 'data-update';
  widgets?: PreviewWidget[];
  sequence?: number;
}

const GLOBALS_OUTLINE_STYLE_ID = 'evershop-globals-outline-style';

function reportWidgetOrder(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.parent === window) return;
  const order: string[] = [];
  const seen = new Set<string>();
  const nodes = document.querySelectorAll('[data-evershop-pb-widget-uid]');
  for (const node of Array.from(nodes)) {
    const uid = node.getAttribute('data-evershop-pb-widget-uid');
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    order.push(uid);
  }
  window.parent.postMessage({ type: 'preview-rendered', widgetOrder: order }, window.location.origin);
}

function ensureGlobalsOutlineStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(GLOBALS_OUTLINE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = GLOBALS_OUTLINE_STYLE_ID;
  style.textContent = [
    'body[data-evershop-globals-view="1"] [data-evershop-global="true"] {',
    '  outline: 2px dashed #8b5cf6 !important;',
    '  outline-offset: 2px;',
    '  position: relative;',
    '}',
    'body[data-evershop-globals-view="1"] [data-evershop-global="true"]::before {',
    '  content: attr(data-evershop-area-id);',
    '  position: absolute;',
    '  top: 0;',
    '  left: 0;',
    '  z-index: 9998;',
    '  background: #8b5cf6;',
    '  color: #fff;',
    '  font-family: monospace;',
    '  font-size: 10px;',
    '  padding: 1px 6px;',
    '  border-radius: 0 0 4px 0;',
    '  pointer-events: none;',
    '}'
  ].join('\n');
  document.head.appendChild(style);
}

export function PageBuilderBridge(): null {
  const { setWidgets } = usePreviewWidgets();
  const lastSequence = useRef(0);

  useEffect(() => {
    if (!isInPageBuilderIframe()) return;
    markPageBuilderActive();

    ensureGlobalsOutlineStyle();
    ensureChromeStyleInjected();

    const onLinkActivate = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('a[href]')) e.preventDefault();
    };
    document.addEventListener('click', onLinkActivate, true);
    document.addEventListener('auxclick', onLinkActivate, true);

    const onBodyClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !document.body.contains(target)) return;
      if (target.closest('[data-evershop-pb-dropzone]')) return;
      document
        .querySelectorAll('[data-evershop-pb-layer-hover="true"]')
        .forEach((el) => el.removeAttribute('data-evershop-pb-layer-hover'));
      window.parent?.postMessage({ type: 'pb-canvas-click' }, window.location.origin);
    };
    document.addEventListener('click', onBodyClick);

    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const raw = event.data as Partial<DataUpdateMessage> & { type?: string; enabled?: boolean; widgetUid?: string } | null;
      if (!raw) return;

      if (raw.type === 'pb-drag-start') {
        document.body.setAttribute('data-evershop-pb-drag', 'true');
        return;
      }
      if (raw.type === 'pb-drag-end') {
        document.body.removeAttribute('data-evershop-pb-drag');
        return;
      }
      if (raw.type === 'globals-view') {
        if (raw.enabled) document.body.dataset.evershopGlobalsView = '1';
        else delete document.body.dataset.evershopGlobalsView;
        return;
      }
      if (raw.type === 'layer-highlight') {
        document
          .querySelectorAll('[data-evershop-pb-layer-hover="true"]')
          .forEach((el) => el.removeAttribute('data-evershop-pb-layer-hover'));
        if (typeof raw.widgetUid === 'string' && raw.widgetUid.length > 0) {
          const target = document.querySelector(`[data-evershop-pb-widget-uid="${raw.widgetUid}"]`);
          if (target) {
            target.setAttribute('data-evershop-pb-layer-hover', 'true');
            (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        return;
      }

      if (raw.type !== 'data-update') return;
      if (typeof raw.sequence === 'number') {
        if (raw.sequence <= lastSequence.current) return;
        lastSequence.current = raw.sequence;
      }
      if (raw.widgets) setWidgets(raw.widgets);

      requestAnimationFrame(() => reportWidgetOrder());
    };

    requestAnimationFrame(() => reportWidgetOrder());

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      document.removeEventListener('click', onBodyClick);
      document.removeEventListener('click', onLinkActivate, true);
      document.removeEventListener('auxclick', onLinkActivate, true);
    };
  }, [setWidgets]);

  return null;
}
