import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { data, redirect, useLoaderData, useRevalidator } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';

import type { AppLoadContext } from '../../../bin/lib/createStorefrontMiddleware.js';
import { UrnService } from '../../../lib/urn/index.js';
import { DiscardConfirmDialog } from '~/components/page-builder-admin/DiscardConfirmDialog.js';
import { PublishDialog } from '~/components/page-builder-admin/PublishDialog.js';
import { RolloutDialog } from '~/components/page-builder-admin/RolloutDialog.js';
import { SessionPicker } from '~/components/page-builder-admin/SessionPicker.js';
import { ThemeSheet } from '~/components/page-builder-admin/ThemeSheet.js';
import { Alert, AlertDescription } from '~/components/ui/alert.js';
import { Button } from '~/components/ui/button.js';
import { getCurrentAdminUser } from '~/lib/admin/session.js';
import { gql } from '~/lib/graphql/client.js';
import { gqlAdmin } from '~/lib/graphql/admin-client.js';
import {
  CHANGESET_STATE_QUERY,
  ROLLOUT_PLAN_SESSION_QUERY,
  ROUTE_QUERY,
  type ChangesetStateResponse,
  type RolloutPlanSessionResponse,
  type RouteResponse
} from '~/lib/graphql/queries/page-builder-admin.js';
import { pageBuilderApi } from '~/lib/page-builder-admin/api.js';
import { getOrCreateDraft } from '~/lib/page-builder-admin/changeset.js';
import { buildPuckConfig } from '~/lib/puck/buildPuckConfig.js';
import { PUCK_CUSTOM_FIELDS } from '~/lib/puck/customFields.js';
import { loadPuckDocumentForEditing } from '~/lib/puck/loadPuckDocumentForEditing.js';
import { useStripInertDevStylesheets } from '~/lib/puck/useStripInertDevStylesheets.js';
import { buildDocumentSaveOp } from '../../../lib/puck/documentOps.js';
import {
  STORE_SETTINGS_QUERY,
  type StoreSettingsResponse
} from '~/lib/graphql/queries/settings.js';
import { resolveThemeTokens } from '~/lib/theme/tokens.js';
import type { PuckDocumentData } from '~/lib/puck/loadPuckDocument.js';

/**
 * The Puck-based page-builder editor.
 *
 * Lives at `/admin/page-builder/puck/:routeId` rather than replacing
 * `/admin/page-builder/edit/:routeId` outright, so the existing editor keeps
 * working while this one is built and compared. The swap is part of the
 * cutover, matching how `?__engine=puck` gates the render path.
 *
 * Three decisions worth reading before changing anything here:
 *
 * **Puck's own history is disabled** (`initialHistory` empty, and the header
 * drives `moveCurrent` instead). Syncing two histories is a losing position:
 * `moveCurrentChange` enforces a rollout floor — undo must not descend below
 * what live traffic is already seeing — which Puck's in-memory state has no
 * concept of, and it would still be wrong after a reload, a competing publish,
 * or a second tab. The cost is honest: undo granularity becomes one changeset
 * op rather than one keystroke. That is coarser than Puck's default but it
 * survives a reload and is shared across tabs, which Puck's is not.
 *
 * **Saves are debounced whole-document snapshots.** Puck's sidebar is live, so
 * writing on every `onChange` would be one op per keystroke. The debounce
 * bounds that client-side; server-side coalescing bounds it properly.
 *
 * **Extras are resolved server-side, not by Puck's `resolveData`.** Same
 * reasoning as the render path: `resolveData` is an editor-time hook, not a
 * data layer. The loader resolves them once, and `/admin/page-builder/extras`
 * re-resolves after a save so a newly dropped commerce widget fills in without
 * a full revalidation.
 */

const SAVE_DEBOUNCE_MS = 800;

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const routeId = params.routeId!;
  const user = await getCurrentAdminUser(context as AppLoadContext);
  if (!user) throw redirect('/admin/login');

  const cookie = request.headers.get('Cookie');
  const { route } = await gqlAdmin<RouteResponse>(ROUTE_QUERY, { id: routeId }, cookie);
  if (!route || route.isApi || route.isAdmin || !route.editableInPageBuilder) {
    throw data('This route is not open for page-builder editing', { status: 404 });
  }

  const url = new URL(request.url);

  // `?session=<rollout-uuid>` opens that rollout's changeset instead of the
  // admin's own draft, same as the legacy editor. Falls back to the draft when
  // the token doesn't resolve.
  const sessionToken = url.searchParams.get('session');
  let changesetId: number;
  let changesetToken: string;
  if (sessionToken) {
    const { rolloutPlan } = await gqlAdmin<RolloutPlanSessionResponse>(
      ROLLOUT_PLAN_SESSION_QUERY,
      { uuid: sessionToken },
      cookie
    );
    if (rolloutPlan) {
      changesetId = rolloutPlan.changesetId;
      changesetToken = rolloutPlan.changeset.token;
    } else {
      const draft = await getOrCreateDraft(user.admin_user_id);
      changesetId = draft.changeset_id;
      changesetToken = draft.token;
    }
  } else {
    const draft = await getOrCreateDraft(user.admin_user_id);
    changesetId = draft.changeset_id;
    changesetToken = draft.token;
  }

  /**
   * Entity scope: `?entity=<urn>` narrows editing to one entity (a specific
   * landing page). The legacy RRv7 editor ignored this entirely — every
   * placement it created hardcoded a null entity — so this is new capability,
   * not a port. NULL means the route's default document.
   *
   * Validated rather than trusted. This value is stored verbatim as
   * `puck_document.scope_urn` and is part of that table's uniqueness key, so
   * a malformed one does not fail — it silently creates a second document for
   * the route that nothing will ever read again. Anything that is not a
   * well-formed URN falls back to the route default, which is the state the
   * merchant sees today.
   */
  const rawEntity = url.searchParams.get('entity');
  const scopeUrn =
    rawEntity && UrnService.isValid(rawEntity) ? rawEntity : null;

  const [changesetState, document, settingsData] = await Promise.all([
    gqlAdmin<ChangesetStateResponse>(
      CHANGESET_STATE_QUERY,
      { id: changesetId, route: routeId },
      cookie
    ),
    loadPuckDocumentForEditing(routeId, scopeUrn, changesetToken),
    gql<StoreSettingsResponse>(STORE_SETTINGS_QUERY)
  ]);

  return {
    route: { id: route.id, name: route.name },
    changeset: {
      id: changesetId,
      token: changesetToken,
      canUndo: changesetState.changeset?.canUndo ?? false,
      canRedo: changesetState.changeset?.canRedo ?? false,
      operationCount: changesetState.changeset?.operationCountForRoute ?? 0
    },
    scopeUrn,
    inRolloutSession: !!sessionToken,
    document,
    themeTokens: resolveThemeTokens(settingsData.setting.themeTokens)
  };
}

export default function PuckPageBuilder() {
  const { route, changeset, scopeUrn, inRolloutSession, document, themeTokens } =
    useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  useStripInertDevStylesheets();

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [rolloutOpen, setRolloutOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [extras, setExtras] = useState<Record<string, unknown>>({});

  // The config carries the field renderers, so it is editor-only. Rebuilt when
  // the registry could have changed — which is never within one mount, hence
  // an empty dependency list.
  const config = useMemo(
    // `routeId` drives which components are locked against delete/duplicate,
    // since required components are per route.
    () => buildPuckConfig({ customFields: PUCK_CUSTOM_FIELDS, routeId: route.id }),
    [route.id]
  );

  /**
   * The document as the SERVER last knew it. Every save diffs against this to
   * decide INSERT vs UPDATE and to fill `old_payload`, so it must advance only
   * on a confirmed write — advancing it optimistically would make a failed
   * save silently lose the previous state it needed to roll back to.
   *
   * `null` means no document exists yet, which is what makes the first save an
   * INSERT.
   */
  const previousRef = useRef<PuckDocumentData | null>(
    document.exists ? document.data : null
  );
  // The document's identity. Minted here for a route edited for the first
  // time, so the op has a target before the row exists.
  const uuidRef = useRef<string>(document.uuid ?? crypto.randomUUID());

  const pendingRef = useRef<PuckDocumentData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when the editor switches route, scope or changeset — otherwise the
  // previous document's identity would be reused and the next save would
  // overwrite it.
  useEffect(() => {
    previousRef.current = document.exists ? document.data : null;
    uuidRef.current = document.uuid ?? crypto.randomUUID();
    pendingRef.current = null;
    setExtras({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.id, scopeUrn, changeset.id]);

  const refreshExtras = useCallback(async (next: PuckDocumentData) => {
    try {
      const res = await fetch('/admin/page-builder/extras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: route.id, data: next })
      });
      if (!res.ok) return;
      const body = (await res.json()) as { extras?: Record<string, unknown> };
      setExtras(body.extras ?? {});
    } catch {
      // Extras are supplementary — a failure leaves commerce widgets showing
      // their empty state, which is the same thing they show before the first
      // resolve lands. Not worth surfacing as an editor error.
    }
  }, [route.id]);

  const flush = useCallback(async () => {
    const next = pendingRef.current;
    if (!next) return;
    pendingRef.current = null;

    setIsSaving(true);
    setError(null);
    try {
      await pageBuilderApi.addOperation(
        changeset.id,
        buildDocumentSaveOp({
          uuid: uuidRef.current,
          route: route.id,
          scopeUrn,
          previous: previousRef.current,
          next
        })
      );
      previousRef.current = next;
      await refreshExtras(next);
      // Undo/redo availability changes with every op; the header reads it from
      // loader data.
      revalidator.revalidate();
    } catch (err) {
      // Surface it. The legacy editor swallowed save failures to the console,
      // which meant a merchant kept editing against state the server had
      // already rejected.
      setError(err instanceof Error ? err.message : 'Failed to save');
      pendingRef.current = next;
    } finally {
      setIsSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeset.id, route.id, scopeUrn, refreshExtras]);

  const handleChange = useCallback(
    (next: PuckDocumentData) => {
      pendingRef.current = next;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
    },
    [flush]
  );

  // Never leave an edit only in the debounce window. A merchant closing the
  // tab a few hundred milliseconds after a change would otherwise lose it.
  useEffect(() => {
    const onLeave = () => {
      if (!pendingRef.current) return;
      const op = buildDocumentSaveOp({
        uuid: uuidRef.current,
        route: route.id,
        scopeUrn,
        previous: previousRef.current,
        next: pendingRef.current
      });
      // `sendBeacon` because a normal fetch is cancelled during unload.
      navigator.sendBeacon?.(
        `/api/page-builder/changesets/${changeset.id}/operations`,
        new Blob(
          [
            JSON.stringify({
              route: op.route,
              entity_urn: op.entityUrn,
              old_payload: op.oldPayload,
              new_payload: op.newPayload,
              change_order: 0
            })
          ],
          { type: 'application/json' }
        )
      );
    };
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('beforeunload', onLeave);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [changeset.id, route.id, scopeUrn]);

  const move = useCallback(
    async (direction: 'undo' | 'redo') => {
      setError(null);
      try {
        // Flush first: an undo that skipped a pending edit would move the
        // cursor past an op that had not been written yet.
        if (timerRef.current) clearTimeout(timerRef.current);
        await flush();
        await pageBuilderApi.moveCurrent(changeset.id, route.id, direction);
        revalidator.revalidate();
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to ${direction}`);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [changeset.id, route.id, flush]
  );

  /**
   * Live theme preview, written straight into Puck's canvas iframe.
   *
   * The legacy editor posted a `theme-preview` message to its own iframe and
   * the storefront bridge applied it. There is no bridge here — the canvas is
   * Puck's frame, same-origin via `srcDoc` — so the stylesheet is injected
   * directly. Same effect, one less hop, and nothing to keep in sync.
   *
   * Preview only ever touches the canvas document: nothing is persisted until
   * Apply, so closing the sheet discards it.
   */
  const handleThemePreview = useCallback((light: string, dark: string) => {
    const frame = window.document.getElementById(
      'preview-frame'
    ) as HTMLIFrameElement | null;
    const doc = frame?.contentDocument;
    if (!doc) return;

    const ID = 'evershop-pb-theme-preview';
    let tag = doc.getElementById(ID) as HTMLStyleElement | null;
    if (!tag) {
      tag = doc.createElement('style');
      tag.id = ID;
      // Appended last so it wins the cascade over the mirrored storefront
      // stylesheet, which is what makes the preview visible at all.
      doc.head.appendChild(tag);
    }
    tag.textContent = `:root{${light}} .dark{${dark}}`;
  }, []);

  const handleThemeApply = useCallback(
    async (light: string, dark: string) => {
      setError(null);
      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            themeTokens: {
              ...themeTokens,
              customLightCss: light,
              customDarkCss: dark
            }
          })
        });
        if (!res.ok) throw new Error(`Theme save failed (${res.status})`);
        setThemeOpen(false);
        // The applied theme is a document-level stylesheet rather than widget
        // data, so no document save can carry it — revalidate so the canvas
        // picks it up from the server the way a shopper would.
        revalidator.revalidate();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply theme');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeTokens]
  );

  /**
   * Human label for the entity scope, e.g. "landing_page · 8f2a1c3d".
   *
   * Parsing is guarded: `scopeUrn` reaches the client from a query parameter,
   * and although the loader validates it, a label is not worth throwing the
   * whole editor over if that ever changes.
   */
  const scopeLabel = useMemo(() => {
    if (!scopeUrn) return null;
    try {
      const { type, uuid } = UrnService.parse(scopeUrn);
      return `${type} \u00b7 ${uuid.slice(0, 8)}`;
    } catch {
      return 'scoped';
    }
  }, [scopeUrn]);

  const metadata = useMemo(
    () => ({ mode: 'edit' as const, extras, page: { routeId: route.id } }),
    [extras, route.id]
  );

  return (
    <div className="flex h-screen flex-col">
      {/*
        Hide Puck's built-in undo/redo. Its history is deliberately empty, so
        these are permanently disabled — leaving them visible next to the
        working pair in `headerActions` gives a merchant two Undo buttons, one
        of which never does anything. Targeted by `aria-label` rather than
        class, since Puck's class names carry a build hash.
      */}
      <style>{`
        .Puck [aria-label="undo"], .Puck [aria-label="redo"] { display: none; }

        /*
          Make an empty widget selectable in the canvas.

          Every palette entry's defaultSettings are empty strings, so a freshly
          dropped widget renders nothing and collapses to zero height — the drop
          looks like it failed and there is nothing to click to configure it.
          buildPuckConfig wraps each component in [data-evershop-widget-shell]
          under mode === 'edit' only, so these rules never reach the storefront.

          :empty matches exactly when the component rendered nothing, so a
          configured widget is untouched. Comments do not defeat :empty.

          Puck mirrors the host document's styles into the canvas iframe, which
          is how these rules apply inside it.
        */
        [data-evershop-widget-shell]:empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 72px;
          padding: 1rem;
          border: 1px dashed color-mix(in oklch, currentColor 35%, transparent);
          border-radius: 0.5rem;
          font: 500 0.8125rem/1.2 ui-sans-serif, system-ui, sans-serif;
          opacity: 0.65;
        }
        [data-evershop-widget-shell]:empty::after {
          content: attr(data-evershop-widget-shell) " — add content in the sidebar";
        }
      `}</style>

      {error ? (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="min-h-0 flex-1">
        <Puck
          config={config as never}
          data={document.data as never}
          metadata={metadata as never}
          onChange={handleChange as never}
          // Puck's in-memory history is deliberately empty — the header's
          // undo/redo drive the changeset cursor instead. See the file header.
          initialHistory={{ histories: [], index: -1 }}
          /**
           * Puck's own style mirroring is left ON. It handles document
           * replacement, HMR and viewport remounts, and its completion is what
           * makes the canvas report READY — which in turn gates the pointer
           * bridging that drag-and-drop across the iframe depends on.
           *
           * It only works because `useStripInertDevStylesheets` removes the
           * dev server's JavaScript-served stylesheet link first; see that
           * hook for why the canvas hangs forever without it.
           */
          overrides={{
            headerActions: () => (
              <div className="flex items-center gap-2">
                {/*
                  Which entity this document belongs to. Without it the editor
                  looks identical whether it is editing one landing page or the
                  default every landing page falls back to — and the merchant
                  would have no way to tell which they just changed.
                */}
                {scopeUrn ? (
                  <span className="mr-1 flex items-center gap-2 text-xs">
                    <span className="rounded bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                      {scopeLabel}
                    </span>
                    <a
                      className="text-muted-foreground underline underline-offset-2"
                      href={`/admin/page-builder/puck/${route.id}`}
                    >
                      Edit route default
                    </a>
                  </span>
                ) : null}
                <span className="mr-2 text-xs text-muted-foreground">
                  {isSaving
                    ? 'Saving…'
                    : `${changeset.operationCount} change${changeset.operationCount === 1 ? '' : 's'}`}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!changeset.canUndo}
                  onClick={() => void move('undo')}
                >
                  Undo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!changeset.canRedo}
                  onClick={() => void move('redo')}
                >
                  Redo
                </Button>
                <Button size="sm" variant="outline" onClick={() => setThemeOpen(true)}>
                  Theme
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRolloutOpen(true)}
                  disabled={changeset.operationCount === 0}
                >
                  Schedule
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDiscardOpen(true)}
                  disabled={changeset.operationCount === 0}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={() => setPublishOpen(true)}
                  disabled={inRolloutSession || changeset.operationCount === 0}
                >
                  Publish
                </Button>
              </div>
            )
          }}
        />
      </div>

      {/* Lists rollout sessions this admin can join; navigates to ?session=. */}
      <SessionPicker routeId={route.id} active={!inRolloutSession} />

      <ThemeSheet
        open={themeOpen}
        onOpenChange={setThemeOpen}
        isBusy={isSaving}
        onPreview={handleThemePreview}
        onApply={handleThemeApply}
      />
      <RolloutDialog
        open={rolloutOpen}
        changesetId={changeset.id}
        editingPlan={null}
        onOpenChange={setRolloutOpen}
        onSaved={() => {
          setRolloutOpen(false);
          revalidator.revalidate();
        }}
      />
      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        operationCount={changeset.operationCount}
        onConfirm={async () => {
          await flush();
          await pageBuilderApi.publish(changeset.id);
          setPublishOpen(false);
          revalidator.revalidate();
        }}
      />
      <DiscardConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        operationCount={changeset.operationCount}
        onConfirm={async () => {
          pendingRef.current = null;
          await pageBuilderApi.discard(changeset.id, route.id);
          setDiscardOpen(false);
          revalidator.revalidate();
        }}
      />
    </div>
  );
}
