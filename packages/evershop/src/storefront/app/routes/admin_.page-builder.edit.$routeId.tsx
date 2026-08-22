import { useCallback, useEffect, useRef, useState } from 'react';
import { data, redirect, useLoaderData, useRevalidator } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs.js';
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
import { STORE_SETTINGS_QUERY, type StoreSettingsResponse } from '~/lib/graphql/queries/settings.js';
import { WIDGETS_FOR_ROUTE_QUERY, type WidgetFragment, type WidgetsForRouteResponse } from '~/lib/graphql/queries/widgets.js';
import { getCurrentAdminUser } from '~/lib/admin/session.js';
import { pageBuilderApi } from '~/lib/page-builder-admin/api.js';
import { getOrCreateDraft } from '~/lib/page-builder-admin/changeset.js';
import { buildAddWidgetOps, buildDeleteOps, buildMoveOp, buildUpdateSettingsOp } from '~/lib/page-builder-admin/operations.js';
import { findPlacement, flattenWidgets } from '~/lib/page-builder-admin/widgetLookup.js';
import { paletteEntry, shuffleCandidates } from '~/lib/page-builder-admin/widgetPalette.js';
import { resolveThemeTokens } from '~/lib/theme/tokens.js';
import type { AppLoadContext } from '../../../bin/lib/createStorefrontMiddleware.js';

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
  const { route, changeset, widgets, inRolloutSession, themeTokens } = useLoaderData<typeof loader>();
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

  const reloadCanvas = useCallback(() => {
    iframeRef.current?.contentWindow?.location.reload();
  }, []);

  const afterMutation = useCallback(() => {
    revalidator.revalidate();
    reloadCanvas();
  }, [revalidator, reloadCanvas]);

  const withBusy = useCallback(async (fn: () => Promise<void>) => {
    setIsBusy(true);
    try {
      await fn();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setIsBusy(false);
    }
  }, []);

  const postToCanvas = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

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
          withBusy(async () => {
            const { ops } = buildAddWidgetOps({
              route: route.id,
              area: msg.area as string,
              sortOrder: msg.sortOrder as number,
              type: entry.type,
              name: entry.label,
              defaultSettings: entry.defaultSettings,
              isGlobal: msg.isGlobal as boolean
            });
            for (const op of ops) await pageBuilderApi.addOperation(changeset.id, op);
            afterMutation();
          });
          break;
        }
        case 'widget-move-up':
        case 'widget-move-down': {
          const found = findPlacement(widgets, msg.widgetUid as string, msg.area as string);
          if (!found) break;
          withBusy(async () => {
            const op = buildMoveOp({
              route: route.id,
              placementUuid: found.placement.uuid,
              oldSortOrder: found.placement.sortOrder,
              newSortOrder: msg.sortOrder as number
            });
            await pageBuilderApi.addOperation(changeset.id, op);
            afterMutation();
          });
          break;
        }
        case 'widget-duplicate': {
          const found = findPlacement(widgets, msg.widgetUid as string, msg.area as string);
          if (!found) break;
          withBusy(async () => {
            const { ops } = buildAddWidgetOps({
              route: route.id,
              area: msg.area as string,
              sortOrder: found.placement.sortOrder + 0.5,
              type: found.widget.type,
              name: `${found.widget.type} copy`,
              defaultSettings: found.widget.rawSettings
            });
            for (const op of ops) await pageBuilderApi.addOperation(changeset.id, op);
            afterMutation();
          });
          break;
        }
        case 'widget-delete': {
          const widgetUid = msg.widgetUid as string;
          const widget = flattenWidgets(widgets).find((w) => w.uuid === widgetUid);
          const placement = widget?.placements[0];
          if (!widget || !placement) break;
          withBusy(async () => {
            const ops = buildDeleteOps({ route: route.id, instanceUuid: widget.uuid, placementUuid: placement.uuid });
            for (const op of ops) await pageBuilderApi.addOperation(changeset.id, op);
            setSelected(null);
            afterMutation();
          });
          break;
        }
        default:
          break;
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [widgets, route.id, changeset.id, afterMutation, withBusy]);

  const handleSaveSettings = (newSettings: Record<string, unknown>) => {
    if (!selected) return;
    withBusy(async () => {
      const op = buildUpdateSettingsOp({
        route: route.id,
        instanceUuid: selected.widgetUid,
        oldSettings: selected.settings,
        newSettings
      });
      await pageBuilderApi.addOperation(changeset.id, op);
      setSelected(null);
      afterMutation();
    });
  };

  const handleAddFromPalette = (variantId: string) => {
    const entry = paletteEntry(variantId);
    if (!entry) return;
    const maxSort = Math.max(
      0,
      ...flattenWidgets(widgets)
        .flatMap((w) => w.placements)
        .filter((p) => p.area === DEFAULT_AREA)
        .map((p) => p.sortOrder)
    );
    withBusy(async () => {
      const { ops } = buildAddWidgetOps({
        route: route.id,
        area: DEFAULT_AREA,
        sortOrder: maxSort + 100,
        type: entry.type,
        name: entry.label,
        defaultSettings: entry.defaultSettings
      });
      for (const op of ops) await pageBuilderApi.addOperation(changeset.id, op);
      afterMutation();
    });
  };

  const clearArea = async () => {
    const existing = flattenWidgets(widgets)
      .flatMap((w) => w.placements.map((placement) => ({ widget: w, placement })))
      .filter(({ placement }) => placement.area === DEFAULT_AREA);
    for (const { widget, placement } of existing) {
      const ops = buildDeleteOps({ route: route.id, instanceUuid: widget.uuid, placementUuid: placement.uuid });
      for (const op of ops) await pageBuilderApi.addOperation(changeset.id, op);
    }
  };

  const handleShuffle = () => {
    withBusy(async () => {
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
      setSelected(null);
      afterMutation();
    });
  };

  const handleClear = () => {
    withBusy(async () => {
      await clearArea();
      setSelected(null);
      afterMutation();
    });
  };

  const handleLayerReorder = (widgetUid: string, oldSortOrder: number, newSortOrder: number) => {
    const found = findPlacement(widgets, widgetUid, DEFAULT_AREA);
    if (!found) return;
    withBusy(async () => {
      const op = buildMoveOp({ route: route.id, placementUuid: found.placement.uuid, oldSortOrder, newSortOrder });
      await pageBuilderApi.addOperation(changeset.id, op);
      afterMutation();
    });
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
    withBusy(async () => {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ themeTokens: { ...themeTokens, customLightCss: light, customDarkCss: dark } })
      });
      if (!res.ok) throw new Error(`Theme save failed (${res.status})`);
      setThemeOpen(false);
      afterMutation();
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
      <Topbar
        routeName={route.name}
        canUndo={changeset.canUndo}
        canRedo={changeset.canRedo}
        isBusy={isBusy}
        globalsView={globalsView}
        deviceMode={deviceMode}
        onUndo={() =>
          withBusy(async () => {
            await pageBuilderApi.moveCurrent(changeset.id, route.id, 'undo');
            afterMutation();
          })
        }
        onRedo={() =>
          withBusy(async () => {
            await pageBuilderApi.moveCurrent(changeset.id, route.id, 'redo');
            afterMutation();
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
              <Palette onAddClick={handleAddFromPalette} />
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
      <SettingsDrawer widget={selected} onClose={() => setSelected(null)} onSave={handleSaveSettings} />
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
          withBusy(async () => {
            await pageBuilderApi.publish(changeset.id);
            setPublishOpen(false);
            afterMutation();
          })
        }
      />
      <DiscardConfirmDialog
        open={discardOpen}
        operationCount={changeset.operationCount}
        isBusy={isBusy}
        onOpenChange={setDiscardOpen}
        onConfirm={() =>
          withBusy(async () => {
            await pageBuilderApi.discard(changeset.id, route.id);
            setDiscardOpen(false);
            afterMutation();
          })
        }
      />
      <RolloutDialog
        open={rolloutOpen}
        changesetId={changeset.id}
        editingPlan={null}
        onOpenChange={setRolloutOpen}
        onSaved={() => afterMutation()}
      />
      <SessionPicker routeId={route.id} active={!inRolloutSession} />
    </div>
  );
}
