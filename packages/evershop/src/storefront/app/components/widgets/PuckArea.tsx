import React from 'react';
import { Render } from '@puckeditor/core/rsc';

import { buildPuckConfig } from '~/lib/puck/buildPuckConfig.js';
import type { PuckDocumentData } from '~/lib/puck/loadPuckDocument.js';

/**
 * Renders a Puck document — the `WidgetArea` counterpart for the Puck engine.
 *
 * Uses `@puckeditor/core/rsc`, the lean server entry: `Render(config, data,
 * metadata)` with no `<Puck>`, so the storefront never ships the editor
 * bundle to visitors.
 *
 * The config is rebuilt per render rather than memoized at module scope
 * because `registerStorefrontWidget()` is an extension point — a module-level
 * config would freeze the component set at import time and silently omit any
 * widget an extension registers later. Building it is a cheap object walk over
 * ~28 entries; if it ever shows up in a profile, memoize on registry size
 * rather than unconditionally.
 *
 * `extras` is threaded through `metadata`, which Puck passes to every
 * component's render including nested slot children (verified in
 * lib/puck/tests/unit/puckContract.test.ts). Components read it by `props.id`,
 * which the converter set to the original `widget_instance.uuid`.
 */
export function PuckArea({
  data,
  extras,
  areaId = 'content',
  isGlobal = false
}: {
  data: PuckDocumentData;
  /** Server-resolved data for commerce widgets, keyed by component id. */
  extras?: Record<string, unknown>;
  areaId?: string;
  isGlobal?: boolean;
}): React.ReactElement {
  // Emit the same wrapper `WidgetArea` does. Puck's own output has no area
  // element, so without this the two pipelines differ structurally even when
  // every widget inside renders identically — which both breaks the
  // byte-diff harness and would quietly change any CSS or selector anchored
  // on the area (the globals-view outline rules key off
  // `[data-evershop-global]`). Matching it keeps the engines drop-in
  // interchangeable for the duration of the migration.
  const wrapperProps: Record<string, unknown> = {
    'data-evershop-area-id': areaId
  };
  if (isGlobal) wrapperProps['data-evershop-global'] = 'true';

  return React.createElement(
    'div',
    wrapperProps,
    React.createElement(Render as never, {
      config: buildPuckConfig() as never,
      data: data as never,
      metadata: { extras: extras ?? {} }
    })
  );
}
