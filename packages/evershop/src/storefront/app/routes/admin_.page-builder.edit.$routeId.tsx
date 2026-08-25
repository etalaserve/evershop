import { useCallback, useEffect, useRef, useState } from 'react';
import { data, redirect, useLoaderData, useRevalidator } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import type { AppLoadContext } from '../../../bin/lib/createStorefrontMiddleware.js';
import { Canvas } from '~/components/page-builder-admin/Canvas.js';
import { DiscardConfirmDialog } from '~/components/page-builder-admin/DiscardConfirmDialog.js';
import { Layers } from '~/components/page-builder-admin/Layers.js';
import { Palette } from '~/components/page-builder-admin/Palette.js';
import { PublishDialog } from '~/components/page-builder-admin/PublishDialog.js';
import { RolloutDialog } from '~/components/page-builder-admin/RolloutDialog.js';
import { SessionPicker } from '~/components/page-builder-admin/SessionPicker.js';
import { SettingsDrawer, type SelectedWidget } from '~/components/page-builder-admin/SettingsDrawer.js';
import { ThemeSheet } from '~/components/page-builder-admin/ThemeSheet.js';
import { Topbar, type DeviceMode } from '~/components/page-builder-admin/Topbar.js';
import { Alert, AlertDescription } from '~/components/ui/alert.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs.js';
import { getCurrentAdminUser } from '~/lib/admin/session.js';
import { gqlAdmin } from '~/lib/graphql/admin-client.js';
import { gql } from '~/lib/graphql/client.js';
import {
  CHANGESET_STATE_QUERY,
  ROLLOUT_PLAN_SESSION_QUERY,
  ROUTE_QUERY,
  type ChangesetStateResponse,
  type RolloutPlanSessionResponse,
  type RouteResponse
} from '~/lib/graphql/queries/page-builder-admin.js';
import { STORE_SETTINGS_QUERY, type StoreSettingsResponse } from '~/lib/graphql/queries/settings.js';
import { WIDGETS_FOR_ROUTE_QUERY, type WidgetFragment, type WidgetsForRouteResponse } from '~/lib/graphql/queries/widgets.js';
import { pageBuilderApi } from '~/lib/page-builder-admin/api.js';
import { getOrCreateDraft } from '~/lib/page-builder-admin/changeset.js';
import {
  applyAdd,
  applyDelete,
  applyMove,
  applyUpdateSettings
} from '~/lib/page-builder-admin/localApply.js';
import { buildAddWidgetOps, buildDeleteOps, buildMoveOp, buildUpdateSettingsOp } from '~/lib/page-builder-admin/operations.js';
import { findPlacement, flattenWidgets } from '~/lib/page-builder-admin/widgetLookup.js';
import { paletteEntry, shuffleCandidates } from '~/lib/page-builder-admin/widgetPalette.js';
import { resolveThemeTokens } from '~/lib/theme/tokens.js';

const DEFAULT_AREA = 'content';
const DEVICE_WIDTH: Record<DeviceMode, string> = { desktop: '100%', tablet: '768px', mobile: '375px' };

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const routeId = params.routeId!;
  const user = await getCurrentAdminUser(context as AppLoadContext);
  if (!user) throw redirect('/admin/login');

  const cookie = request.headers.get('Cookie');
  const { route } = await gqlAdmin<RouteResponse>(ROUTE_QUERY, { id: routeId }, cookie);
  if (!route || route.isApi || route.isAdmin || !route.editableInPageBuilder) {
    throw data('This route is not open for page-builder editing', { status: 404 });
  }

  // `?session=<rollout-uuid>` opens that rollout's changeset instead of the
  // admin's own draft — "rollout edit mode", reached via SessionPicker or a
  // shared link. Falls back to the draft if the token doesn't resolve.
  const sessionToken = new URL(request.url).searchParams.get('session');
  let changesetId: number;
  let changesetToken: string;
  if (sessionToken) {
    const { rolloutPlan } = await gqlAdmin<RolloutPlanSessionResponse>(ROLLOUT_PLAN_SESSION_QUERY, { uuid: sessionToken }, cookie);
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

  const [changesetState, widgetsData, settingsData] = await Promise.all([
    gqlAdmin<ChangesetStateResponse>(CHANGESET_STATE_QUERY, { id: changesetId, route: routeId }, cookie),
    gql<WidgetsForRouteResponse>(WIDGETS_FOR_ROUTE_QUERY, { route: routeId, changeset: changesetToken }),
    gql<StoreSettingsResponse>(STORE_SETTINGS_QUERY)
  ]);

  return {
    route: { id: route.id, name: route.name, previewPath: route.previewPath || route.path },
    changeset: {
      id: changesetId,
      token: changesetToken,
      canUndo: changesetState.changeset?.canUndo ?? false,
      canRedo: changesetState.changeset?.canRedo ?? false,
      operationCount: changesetState.changeset?.operationCountForRoute ?? 0
    },
    widgets: widgetsData.widgetsForRoute,
    inRolloutSession: !!sessionToken,
    themeTokens: resolveThemeTokens(settingsData.setting.themeTokens)
  };
}

export default function PageBuilderEditor() {
  const { route, changeset, widgets: loaderWidgets, inRolloutSession, themeTokens } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selected, setSelected] = useState<SelectedWidget | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [leftTab, setLeftTab] = useState<'widgets' | 'layers'>('widgets');
  const [globalsView, setGlobalsView] = useState(false);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [publishOpen, setPublishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [rolloutOpen, setRolloutOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Optimistic mirror of the widget tree. Null until the first edit, so the
   * initial render is plain loader data. Once set it wins, and every
   * mutation replaces it — first with a locally-computed guess (instant),
   * then with the authoritative server snapshot a moment later.
   */
  const [overlay, setOverlay] = useState<WidgetFragment[] | null>(null);
  const widgets = overlay ?? loaderWidgets;

  // Latest-value refs so the message handler and mutation helpers never close
  // over a stale tree (they're registered once, not per render).
  const widgetsRef = useRef(widgets);
  widgetsRef.current = widgets;
  const extrasRef = useRef<Record<string, unknown>>({});
  // Monotonic, shared by optimistic and authoritative pushes — the canvas
  // bridge drops any `data-update` whose sequence isn't strictly greater.
  const seqRef = useRef(0);
  // The most recently *initiated* mutation. An in-flight older mutation whose
  // snapshot arrives late must not overwrite a newer one's state.
  const latestSeqRef = useRef(0);

  // Reset the mirror when the editor switches route or changeset — otherwise
  // the previous page's tree would flash into the new canvas.
  useEffect(() => {
    setOverlay(null);
    extrasRef.current = {};
  }, [route.id, changeset.token]);

  const postToCanvas = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  const pushToCanvas = useCallback(
    (tree: WidgetFragment[], extras: Record<string, unknown>, sequence: number) => {
      postToCanvas({ type: 'data-update', widgets: tree, extras, sequence });
    },
    [postToCanvas]
  );

  /** Authoritative widget tree + server-resolved extras for the current route/changeset. */
  const fetchSnapshot = useCallback(async () => {
    const params = new URLSearchParams({ route: route.id, changeset: changeset.token });
    const res = await fetch(`/admin/page-builder/preview?${params.toString()}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error(`Could not refresh the preview (${res.status})`);
    return (await res.json()) as { widgets: WidgetFragment[]; extras: Record<string, unknown> };
  }, [route.id, changeset.token]);

  const applySnapshot = useCallback(
    (snap: { widgets: WidgetFragment[]; extras: Record<string, unknown> }) => {
      extrasRef.current = snap.extras;
      setOverlay(snap.widgets);
      pushToCanvas(snap.widgets, snap.extras, ++seqRef.current);
    },
    [pushToCanvas]
  );

  /**
   * Settle a mutation against the server. On success the authoritative
   * snapshot replaces the optimistic tree wholesale — no merging, so a bug in
   * `localApply` self-corrects within a round trip instead of persisting.
   *
   * On failure we re-sync from the server rather than reverting to the
   * pre-edit tree: operations are still posted one at a time, so a partial
   * failure may have committed some of them, and a blind revert would show
   * state that no longer matches the changeset. (Once writes are atomic this
   * can become a true revert.)
   */
  const settle = useCallback(
    async (seq: number, remote: () => Promise<void>) => {
      setIsBusy(true);
      setError(null);
      try {
        await remote();
        const snap = await fetchSnapshot();
        if (latestSeqRef.current !== seq) return; // superseded by a newer edit
        applySnapshot(snap);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        try {
          applySnapshot(await fetchSnapshot());
        } catch {
          // Leave the optimistic tree in place; the banner already says why.
        }
      } finally {
        setIsBusy(false);
        // Only for the topbar's canUndo/canRedo/operationCount — the widget
        // tree comes from the snapshot above, not from this.
        revalidator.revalidate();
      }
    },
    [fetchSnapshot, applySnapshot, revalidator]
  );

  /** Optimistic path: show the edit immediately, then reconcile. */
  const mutate = useCallback(
    (localFn: (tree: WidgetFragment[]) => WidgetFragment[], remote: () => Promise<void>) => {
      const seq = ++seqRef.current;
      latestSeqRef.current = seq;
      const optimistic = localFn(widgetsRef.current);
      setOverlay(optimistic);
      pushToCanvas(optimistic, extrasRef.current, seq);
      void settle(seq, remote);
    },
    [pushToCanvas, settle]
  );

  /**
   * Non-optimistic path, for mutations whose local result isn't worth
   * predicting (shuffle, clear, undo/redo, publish, discard): run it, then
   * take whatever the server says.
   */
  const runRemote = useCallback(
    (remote: () => Promise<void>) => {
      const seq = ++seqRef.current;
      latestSeqRef.current = seq;
      void settle(seq, remote);
    },
    [settle]
  );

  function selectWidget(widget: WidgetFragment) {
    setSelected({ widgetUid: widget.uuid, widgetType: widget.type, settings: widget.rawSettings });
  }

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const msg = event.data as { type?: string } & Record<string, unknown>;
      if (!msg?.type) return;

      switch (msg.type) {
        case 'widget-selected': {
          setSelected({
            widgetUid: msg.widgetUid as string,
            widgetType: msg.widgetType as string,
            settings: (msg.settings as Record<string, unknown>) ?? {}
          });
          break;
        }
        case 'pb-canvas-click': {
          setSelected(null);
          break;
        }
        case 'pb-drop': {
          const entry = paletteEntry(msg.widgetType as string);
          if (!entry) break;
          const area = msg.area as string;
          const sortOrder = msg.sortOrder as number;
          const { ops, ids } = buildAddWidgetOps({
            route: route.id,
            area,
            sortOrder,
            type: entry.type,
            name: entry.label,
            defaultSettings: entry.defaultSettings,
            isGlobal: msg.isGlobal as boolean
          });
          mutate(
            (tree) =>
              applyAdd(tree, {
                instanceUuid: ids.instanceUuid,
                placementUuid: ids.placementUuid,
                type: entry.type,
                area,
                sortOrder,
                settings: entry.defaultSettings
              }),
            async () => {
              for (const op of ops) await pageBuilderApi.addOperation(changeset.id, op);
            }
          );
          break;
        }
        case 'widget-move-up':
        case 'widget-move-down': {
          const widgetUid = msg.widgetUid as string;
          const area = msg.area as string;
          const newSortOrder = msg.sortOrder as number;
          const found = findPlacement(widgetsRef.current, widgetUid, area);
          if (!found) break;
          const op = buildMoveOp({
            route: route.id,
            placementUuid: found.placement.uuid,
            oldSortOrder: found.placement.sortOrder,
            newSortOrder
          });
          mutate(
            (tree) => applyMove(tree, widgetUid, area, newSortOrder),
            async () => {
              await pageBuilderApi.addOperation(changeset.id, op);
            }
          );
          break;
        }
        case 'widget-duplicate': {
          const area = msg.area as string;
          const found = findPlacement(widgetsRef.current, msg.widgetUid as string, area);
          if (!found) break;
          const sortOrder = found.placement.sortOrder + 0.5;
          const { ops, ids } = buildAddWidgetOps({
            route: route.id,
            area,
            sortOrder,
            type: found.widget.type,
            name: `${found.widget.type} copy`,
            defaultSettings: found.widget.rawSettings
          });
          mutate(
            (tree) =>
              applyAdd(tree, {
                instanceUuid: ids.instanceUuid,
                placementUuid: ids.placementUuid,
                type: found.widget.type,
                area,
                sortOrder,
                settings: found.widget.rawSettings
              }),
            async () => {
              for (const op of ops) await pageBuilderApi.addOperation(changeset.id, op);
            }
          );
          break;
        }
        case 'widget-delete': {
          const widgetUid = msg.widgetUid as string;
          const widget = flattenWidgets(widgetsRef.current).find((w) => w.uuid === widgetUid);
          const placement = widget?.placements[0];
          if (!widget || !placement) break;
          const ops = buildDeleteOps({
            route: route.id,
            instanceUuid: widget.uuid,
            placementUuid: placement.uuid
          });
          setSelected(null);
          mutate(
            (tree) => applyDelete(tree, widgetUid),
            async () => {
              for (const op of ops) await pageBuilderApi.addOperation(changeset.id, op);
            }
          );
          break;
        }
        default:
          break;
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [route.id, changeset.id, mutate]);

  const handleSaveSettings = (newSettings: Record<string, unknown>) => {
    if (!selected) return;
    const widgetUid = selected.widgetUid;
    const op = buildUpdateSettingsOp({
      route: route.id,
      instanceUuid: widgetUid,
      oldSettings: selected.settings,
      newSettings
    });
    // Advance the drawer's baseline instead of closing it — the previous
    // behavior (setSelected(null)) forced a re-select for every single edit.
    setSelected({ ...selected, settings: newSettings });
    mutate(
      (tree) => applyUpdateSettings(tree, widgetUid, newSettings),
      async () => {
        await pageBuilderApi.addOperation(changeset.id, op);
      }
    );
  };

  const handleAddFromPalette = (variantId: string) => {
    const entry = paletteEntry(variantId);
    if (!entry) return;
    const maxSort = Math.max(
      0,
      ...flattenWidgets(widgetsRef.current)
        .flatMap((w) => w.placements)
        .filter((p) => p.area === DEFAULT_AREA)
        .map((p) => p.sortOrder)
    );
    const sortOrder = maxSort + 100;
    const { ops, ids } = buildAddWidgetOps({
      route: route.id,
      area: DEFAULT_AREA,
      sortOrder,
      type: entry.type,
      name: entry.label,
      defaultSettings: entry.defaultSettings
    });
    mutate(
      (tree) =>
        applyAdd(tree, {
          instanceUuid: ids.instanceUuid,
          placementUuid: ids.placementUuid,
          type: entry.type,
          area: DEFAULT_AREA,
          sortOrder,
          settings: entry.defaultSettings
        }),
      async () => {
        for (const op of ops) await pageBuilderApi.addOperation(changeset.id, op);
      }
    );
  };

  const clearArea = async () => {
    const existing = flattenWidgets(widgetsRef.current)
      .flatMap((w) => w.placements.map((placement) => ({ widget: w, placement })))
      .filter(({ placement }) => placement.area === DEFAULT_AREA);
    for (const { widget, placement } of existing) {
      const ops = buildDeleteOps({ route: route.id, instanceUuid: widget.uuid, placementUuid: placement.uuid });
      for (const op of ops) await pageBuilderApi.addOperation(changeset.id, op);
    }
  };

  const handleShuffle = () => {
    setSelected(null);
    runRemote(async () => {
      await clearArea();
      const pool = shuffleCandidates();
      const count = Math.min(pool.length, 4 + Math.floor(Math.random() * 3));
      let sortOrder = 100;
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        const entry = pool.splice(idx, 1)[0];
        const { ops } = buildAddWidgetOps({
          route: route.id,
          area: DEFAULT_AREA,
          sortOrder,
          type: entry.type,
          name: entry.label,
          defaultSettings: entry.defaultSettings
        });
        for (const op of ops) await pageBuilderApi.addOperation(changeset.id, op);
        sortOrder += 100;
      }
    });
  };

  const handleClear = () => {
    setSelected(null);
    // Optimistically empty the area — the ops themselves still go one at a
    // time, but the canvas shouldn't wait for all of them to clear.
    mutate(
      (tree) =>
        flattenWidgets(tree)
          .filter((w) => w.placements.some((p) => p.area === DEFAULT_AREA))
          .reduce((acc, w) => applyDelete(acc, w.uuid), tree),
      () => clearArea()
    );
  };

  const handleLayerReorder = (widgetUid: string, oldSortOrder: number, newSortOrder: number) => {
    const found = findPlacement(widgetsRef.current, widgetUid, DEFAULT_AREA);
    if (!found) return;
    const op = buildMoveOp({
      route: route.id,
      placementUuid: found.placement.uuid,
      oldSortOrder,
      newSortOrder
    });
    mutate(
      (tree) => applyMove(tree, widgetUid, DEFAULT_AREA, newSortOrder),
      async () => {
        await pageBuilderApi.addOperation(changeset.id, op);
      }
    );
  };

  const toggleGlobalsView = () => {
    const next = !globalsView;
    setGlobalsView(next);
    postToCanvas({ type: 'globals-view', enabled: next });
  };

  const handleThemePreview = (light: string, dark: string) => {
    postToCanvas({ type: 'theme-preview', light, dark });
  };

  const handleThemeApply = (light: string, dark: string) => {
    runRemote(async () => {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ themeTokens: { ...themeTokens, customLightCss: light, customDarkCss: dark } })
      });
      if (!res.ok) throw new Error(`Theme save failed (${res.status})`);
      setThemeOpen(false);
      // The applied theme is a document-level stylesheet, not widget data, so
      // a snapshot push can't deliver it — reload the canvas once, here only.
      iframeRef.current?.contentWindow?.location.reload();
    });
  };

  return (
    <div className="flex h-screen flex-col">
      {/* No admin shell exists to match here (same "hide the storefront
          chrome" approach as admin_.login.tsx) — the editor also escapes
          admin.tsx's layout (needs the full viewport, not a centered
          max-w-6xl column), so both storefront AND admin chrome need
          hiding, not just storefront. */}
      <style>{'header, footer { display: none !important; }'}</style>
      {error && (
        // Mutation failures used to be swallowed into console.error, leaving
        // the canvas showing an edit the server had rejected.
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <button type="button" className="shrink-0 underline" onClick={() => setError(null)}>
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      )}
      <Topbar
        routeName={route.name}
        canUndo={changeset.canUndo}
        canRedo={changeset.canRedo}
        isBusy={isBusy}
        globalsView={globalsView}
        deviceMode={deviceMode}
        onUndo={() =>
          runRemote(async () => {
            await pageBuilderApi.moveCurrent(changeset.id, route.id, 'undo');
          })
        }
        onRedo={() =>
          runRemote(async () => {
            await pageBuilderApi.moveCurrent(changeset.id, route.id, 'redo');
          })
        }
        onShuffle={handleShuffle}
        onClear={handleClear}
        onPublish={() => setPublishOpen(true)}
        onDiscard={() => setDiscardOpen(true)}
        onToggleGlobalsView={toggleGlobalsView}
        onDeviceModeChange={setDeviceMode}
        onScheduleRollout={() => setRolloutOpen(true)}
        onOpenTheme={() => setThemeOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 overflow-y-auto border-r border-border">
          <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as 'widgets' | 'layers')} className="h-full">
            <TabsList className="mx-2 mt-2">
              <TabsTrigger value="widgets">Widgets</TabsTrigger>
              <TabsTrigger value="layers">Layers</TabsTrigger>
            </TabsList>
            <TabsContent value="widgets">
              <Palette
                onAddClick={handleAddFromPalette}
                onDragStart={() => postToCanvas({ type: 'pb-drag-start' })}
                onDragEnd={() => postToCanvas({ type: 'pb-drag-end' })}
              />
            </TabsContent>
            <TabsContent value="layers">
              <Layers
                widgets={widgets}
                areaId={DEFAULT_AREA}
                selectedUid={selected?.widgetUid ?? null}
                onSelect={selectWidget}
                onHover={(widgetUid) => postToCanvas({ type: 'layer-highlight', widgetUid })}
                onReorder={handleLayerReorder}
              />
            </TabsContent>
          </Tabs>
        </aside>
        <main className="flex flex-1 items-start justify-center overflow-auto bg-muted/30 p-4">
          <div style={{ width: DEVICE_WIDTH[deviceMode], height: '100%', transition: 'width 0.15s ease' }} className="overflow-hidden rounded-md border border-border bg-background shadow-sm">
            <Canvas ref={iframeRef} src={`${route.previewPath}?changeset=${changeset.token}`} />
          </div>
        </main>
      </div>
      <SettingsDrawer
        widget={selected}
        isBusy={isBusy}
        onClose={() => setSelected(null)}
        onSave={handleSaveSettings}
      />
      <ThemeSheet
        open={themeOpen}
        onOpenChange={setThemeOpen}
        isBusy={isBusy}
        onPreview={handleThemePreview}
        onApply={handleThemeApply}
      />
      <PublishDialog
        open={publishOpen}
        operationCount={changeset.operationCount}
        isBusy={isBusy}
        onOpenChange={setPublishOpen}
        onConfirm={() =>
          runRemote(async () => {
            await pageBuilderApi.publish(changeset.id);
            setPublishOpen(false);
          })
        }
      />
      <DiscardConfirmDialog
        open={discardOpen}
        operationCount={changeset.operationCount}
        isBusy={isBusy}
        onOpenChange={setDiscardOpen}
        onConfirm={() =>
          runRemote(async () => {
            await pageBuilderApi.discard(changeset.id, route.id);
            setDiscardOpen(false);
            setSelected(null);
          })
        }
      />
      <RolloutDialog
        open={rolloutOpen}
        changesetId={changeset.id}
        editingPlan={null}
        onOpenChange={setRolloutOpen}
        onSaved={() => runRemote(async () => {})}
      />
      <SessionPicker routeId={route.id} active={!inRolloutSession} />
    </div>
  );
}
