import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Globe2 } from 'lucide-react';
import {
  THEME_PRESETS,
  registerThemePreset,
  unregisterThemePreset,
  type GlobeKind,
  type HeatmapDataEntry,
  type PartialTokenSet,
  type ThemePresetName,
} from '@your-globe/core';

import { TooltipProvider } from '@/components/ui/tooltip';
import { GlobePreview } from '@/components/studio/GlobePreview';
import { Panel } from '@/components/studio/panels/Panel';
import { StagePanel } from '@/components/studio/panels/StagePanel';
import { StudioInspectorPanel } from '@/components/studio/panels/StudioInspectorPanel';
import {
  getStudioNavItem,
  type StudioInspectorId,
} from '@/components/studio/panels/studio-inspector-model';
import { StatusDock } from '@/components/studio/panels/StatusDock';
import { TopCommandBar } from '@/components/studio/panels/TopCommandBar';
import { CustomThemeModal } from '@/components/studio/modals/CustomThemeModal';
import { ManageSavedModal } from '@/components/studio/modals/ManageSavedModal';
import { SavePresetModal } from '@/components/studio/modals/SavePresetModal';
import { CommandPalette } from '@/components/studio/CommandPalette';
import './studio.css';
import type { StudioDocument } from '@/lib/studio-document';
import { resetAllPanelState } from '@/hooks/usePanelState';
import {
  bootstrapCustomThemes,
  deleteCustomTheme,
  saveCustomTheme,
  type CustomTheme,
} from '@/lib/custom-themes';
import {
  deleteCustomPreset,
  loadCustomPresets,
  type CustomPreset,
} from '@/lib/custom-presets';
import {
  buildDataLayer,
  buildGlobeConfig,
  dataSummaryForState,
  type DataLayerCallbacks,
} from '@/configurator/builders';
import { getChartDataset, getHeatmapDataset } from '@/configurator/datasets';
import {
  configuratorPresets,
  defaultThemeForKind,
  globeDefaultsForKind,
  initialStateForPath,
} from '@/configurator/defaults';
import type {
  ActiveLayer,
  ChartsSettings,
  ConfiguratorState,
  GlobeSettings,
  HeatmapDatasetState,
  HeatmapSettings,
  HexbinSettings,
  RuntimeStatus,
} from '@/configurator/types';

const StudioTransferDialog = lazy(() => import('@/components/studio/modals/StudioTransferDialog'));

/**
 * Layer is selectable via `?layer=heatmap|hexbin|charts|none`. Falls back
 * to the path-based heuristic for legacy bookmarks (heatmap.html etc.) and
 * finally to the default (`none`) when nothing is specified.
 */
const initialState = (search: URLSearchParams): ConfiguratorState => {
  const layer = search.get('layer');
  const base = isActiveLayer(layer)
    ? { ...initialStateForPath(`/${layer}`), activeLayer: layer }
    : initialStateForPath(window.location.pathname);
  const kind = search.get('kind');
  if (!isGlobeKind(kind)) return base;
  const theme = search.get('theme');
  const themeOverride =
    theme !== null && theme.startsWith(`${kind}-`) && Object.prototype.hasOwnProperty.call(THEME_PRESETS, theme)
      ? { theme: theme as ThemePresetName }
      : {};
  return {
    ...base,
    globe: {
      ...base.globe,
      ...globeDefaultsForKind(kind),
      ...themeOverride,
    },
  };
};

const isGlobeKind = (value: string | null): value is GlobeKind =>
  value === 'cinematic' ||
  value === 'outline' ||
  value === 'dotted' ||
  value === 'wireframe' ||
  value === 'paper' ||
  value === 'hologram';

const isActiveLayer = (value: string | null): value is ActiveLayer =>
  value === 'heatmap' ||
  value === 'hexbin' ||
  value === 'charts' ||
  value === 'none';

export default function Studio() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<ConfiguratorState>(() =>
    initialState(searchParams)
  );

  // Lock the page to a fixed-viewport mode while the configurator is
  // mounted; remove on unmount so the marketing home / other routes can
  // scroll normally again.
  useEffect(() => {
    document.body.classList.add('studio-mode');
    return () => document.body.classList.remove('studio-mode');
  }, []);
  // User-created themes — bootstrapped from localStorage on first paint
  // and registered with core's theme system synchronously so themed
  // selectors can resolve them on the very first render.
  const [customThemes, setCustomThemes] = useState<ReadonlyArray<CustomTheme>>(
    () => bootstrapCustomThemes()
  );
  const [customPresets, setCustomPresets] = useState<
    ReadonlyArray<CustomPreset>
  >(() => loadCustomPresets());
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [themeBase, setThemeBase] = useState(state.globe.theme);
  const [themeRevision, setThemeRevision] = useState(0);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | undefined>(
    undefined
  );
  const [savePresetModalOpen, setSavePresetModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeInspector, setActiveInspector] =
    useState<StudioInspectorId>('stage-camera');
  const [transferMode, setTransferMode] = useState<'export' | 'import' | null>(null);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [mobilePanel, setMobilePanel] = useState<'stage' | 'inspector' | null>(null);
  const [importRevision, setImportRevision] = useState(0);
  const [importedHeatmap, setImportedHeatmap] = useState<{ id: HeatmapSettings['dataset']; data: readonly HeatmapDataEntry[] } | null>(null);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => { setCompact(query.matches); setMobilePanel(null); };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  // Theme that was active when the user opened the theme modal — used to
  // restore on Cancel after live-preview swapped the globe to '__preview__'.
  const previewPreviousThemeRef = useRef<ThemePresetName | null>(null);
  const [heatmapDataset, setHeatmapDataset] = useState<HeatmapDatasetState>({
    id: state.heatmap.dataset,
    data: [],
    loading: state.activeLayer === 'heatmap',
    error: null,
  });
  const [command, setCommand] = useState<{
    readonly type: 'none' | 'replay' | 'home';
    readonly nonce: number;
  }>({
    type: 'none',
    nonce: 0,
  });
  const [status, setStatus] = useState<RuntimeStatus>({
    ready: false,
    message: 'Booting globe',
    hover: 'No pointer event yet',
    layerSummary: 'Layer pending',
    dataSummary: 'Dataset pending',
  });

  useEffect(() => {
    let cancelled = false;
    const datasetId = state.heatmap.dataset;
    if (state.activeLayer !== 'heatmap') {
      setHeatmapDataset((current) => ({ ...current, loading: false }));
      return;
    }
    if (importedHeatmap?.id === datasetId) {
      setHeatmapDataset({ id: datasetId, data: importedHeatmap.data, loading: false, error: null });
      return;
    }
    setHeatmapDataset((current) => ({
      id: datasetId,
      data: current.id === datasetId ? current.data : [],
      loading: true,
      error: null,
    }));

    void getHeatmapDataset(datasetId)
      .then((data) => {
        if (cancelled) return;
        setHeatmapDataset({ id: datasetId, data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setHeatmapDataset({
          id: datasetId,
          data: [],
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [state.activeLayer, state.heatmap.dataset, importedHeatmap, importRevision]);

  const setRuntimeMessage = useCallback((message: string) => {
    setStatus((current) => ({ ...current, message }));
  }, []);

  const setReady = useCallback((ready: boolean) => {
    setStatus((current) => ({ ...current, ready }));
  }, []);

  const callbacks = useMemo<DataLayerCallbacks>(
    () => ({
      onHexbinHover: (payload) => {
        setStatus((current) => ({
          ...current,
          hover: payload
            ? `Cell ${payload.cellIndex} / ${
                payload.empty ? 'empty' : payload.value.toFixed(2)
              } / ${payload.sampleCount} samples`
            : 'Hexbin hover cleared',
        }));
      },
      onHexbinClick: (payload) => {
        setStatus((current) => ({
          ...current,
          hover: `Clicked cell ${
            payload.cellIndex
          } at ${payload.position[0].toFixed(1)}, ${payload.position[1].toFixed(
            1
          )}`,
        }));
      },
      onChartsHover: (payload) => {
        const dataset = getChartDataset(state.charts.dataset);
        setStatus((current) => ({
          ...current,
          hover: payload
            ? `${payload.entry.label ?? payload.entry.id ?? 'Chart'} / ${
                dataset.series.find(
                  (series) => series.key === payload.seriesKey
                )?.label ??
                payload.seriesKey ??
                'value'
              }: ${payload.value}`
            : 'Charts hover cleared',
        }));
      },
      onChartsClick: (payload) => {
        setStatus((current) => ({
          ...current,
          hover: `Clicked ${
            payload.entry.label ?? payload.entry.id ?? 'chart'
          } / ${payload.value}`,
        }));
      },
      onHeatmapHover: (entry) => {
        setStatus((current) => ({
          ...current,
          hover: entry
            ? `${
                entry.name ?? entry.id ?? 'Heat point'
              } / ${entry.value.toFixed(2)}`
            : 'Heatmap hover cleared',
        }));
      },
      onHeatmapClick: (entry) => {
        setStatus((current) => ({
          ...current,
          hover: `Clicked ${
            entry.name ?? entry.id ?? 'heat point'
          } / ${entry.position[0].toFixed(1)}, ${entry.position[1].toFixed(1)}`,
        }));
      },
    }),
    [state.charts.dataset]
  );

  const globeConfig = useMemo(() => buildGlobeConfig(state), [state]);
  const dataLayer = useMemo(
    () => buildDataLayer(state, heatmapDataset.data, callbacks),
    [callbacks, heatmapDataset.data, state.activeLayer, state.heatmap, state.hexbin, state.charts]
  );

  useEffect(() => {
    setStatus((current) => ({
      ...current,
      dataSummary: dataSummaryForState(state, heatmapDataset.data),
      layerSummary: `${state.activeLayer} layer / ${state.globe.kind} kind`,
    }));
  }, [heatmapDataset.data, state]);

  // Every direct configurator update marks the state as "dirty since
  // last preset" so the top-bar preset selector can show a "(modified)"
  // hint. Applying a preset is the only path that resets dirty back to
  // false (see applyPreset below).
  const markDirty = (
    current: ConfiguratorState
  ): Pick<ConfiguratorState, 'dirtySincePreset'> =>
    current.lastPresetId
      ? { dirtySincePreset: true }
      : { dirtySincePreset: false };

  const updateGlobe = useCallback((patch: Partial<GlobeSettings>) => {
    setState((current) => ({
      ...current,
      ...markDirty(current),
      globe: { ...current.globe, ...patch },
    }));
  }, []);

  const updateHeatmap = useCallback((patch: Partial<HeatmapSettings>) => {
    if (patch.dataset !== undefined) setImportedHeatmap(null);
    setState((current) => ({
      ...current,
      ...markDirty(current),
      heatmap: { ...current.heatmap, ...patch },
    }));
  }, []);

  const updateHexbin = useCallback((patch: Partial<HexbinSettings>) => {
    setState((current) => ({
      ...current,
      ...markDirty(current),
      hexbin: { ...current.hexbin, ...patch },
    }));
  }, []);

  const updateCharts = useCallback((patch: Partial<ChartsSettings>) => {
    setState((current) => ({
      ...current,
      ...markDirty(current),
      charts: { ...current.charts, ...patch },
    }));
  }, []);

  const updateLayer = useCallback((activeLayer: ActiveLayer) => {
    setState((current) => ({ ...current, ...markDirty(current), activeLayer }));
  }, []);

  const applyPreset = useCallback(
    (id: string) => {
      setImportedHeatmap(null);
      // Built-in preset (partial patch onto current state).
      const builtIn = configuratorPresets.find((entry) => entry.id === id);
      if (builtIn) {
        setState((current) => ({
          ...current,
          activeLayer: builtIn.patch.activeLayer ?? current.activeLayer,
          globe: builtIn.patch.globe
            ? { ...current.globe, ...builtIn.patch.globe }
            : current.globe,
          heatmap: builtIn.patch.heatmap
            ? { ...current.heatmap, ...builtIn.patch.heatmap }
            : current.heatmap,
          hexbin: builtIn.patch.hexbin
            ? { ...current.hexbin, ...builtIn.patch.hexbin }
            : current.hexbin,
          charts: builtIn.patch.charts
            ? { ...current.charts, ...builtIn.patch.charts }
            : current.charts,
          lastPresetId: id,
          dirtySincePreset: false,
        }));
        setRuntimeMessage(`Preset applied: ${builtIn.label}`);
        return;
      }
      // User preset (full snapshot — replace state wholesale).
      const custom = customPresets.find((entry) => entry.id === id);
      if (custom) {
        setState({
          ...custom.state,
          lastPresetId: id,
          dirtySincePreset: false,
        });
        setRuntimeMessage(`Preset applied: ${custom.name}`);
      }
    },
    [customPresets, setRuntimeMessage]
  );

  const sendCommand = useCallback((type: 'replay' | 'home') => {
    setCommand((current) => ({ type, nonce: current.nonce + 1 }));
  }, []);

  const importProject = useCallback((project: StudioDocument) => {
    let themes = [...customThemes];
    let themeId = project.state.globe.theme;
    // Keep colliding local themes intact; the imported scene receives its own ID.
    for (const incoming of project.customThemes) {
      const existing = themes.find((theme) => theme.id === incoming.id);
      if (existing && JSON.stringify(existing.tokens) === JSON.stringify(incoming.tokens)) continue;
      let id = incoming.id;
      let suffix = 2;
      while (themes.some((theme) => theme.id === id)) id = `${incoming.id}-${suffix++}`;
      const saved = { ...incoming, id };
      saveCustomTheme(saved);
      themes = [saved, ...themes];
      if (project.state.globe.theme === incoming.id) themeId = id as ThemePresetName;
    }
    setCustomThemes(themes);
    const snapshot = project.heatmapData === undefined ? null : {
      id: project.state.heatmap.dataset, data: project.heatmapData,
    };
    setImportedHeatmap(snapshot);
    setImportRevision((revision) => revision + 1);
    setHeatmapDataset({
      id: project.state.heatmap.dataset,
      data: snapshot?.data ?? [],
      loading: !snapshot && project.state.activeLayer === 'heatmap', error: null,
    });
    setState({ ...project.state, globe: { ...project.state.globe, theme: themeId }, lastPresetId: null, dirtySincePreset: false });
    setActiveInspector('stage-camera');
    setMobilePanel(null);
    setTransferMode(null);
    setRuntimeMessage('Studio project opened');
  }, [customThemes, setRuntimeMessage]);

  const reset = useCallback(() => {
    setState(initialState(searchParams));
    // Wipe persisted panel/section collapse states too — "Reset" should
    // give a fresh slate, not just rewind the data settings while leaving
    // a half-collapsed UI behind. Reload to re-hydrate panel defaults.
    resetAllPanelState();
    setRuntimeMessage('Configurator reset · reloading…');
    setTimeout(() => window.location.reload(), 200);
  }, [searchParams, setRuntimeMessage]);

  const openThemeEditor = (theme?: CustomTheme) => {
    previewPreviousThemeRef.current = state.globe.theme;
    setThemeBase(state.globe.theme);
    setEditingTheme(theme);
    setThemeModalOpen(true);
  };

  const previewTheme = useCallback(({ tokens }: { extends: ThemePresetName; tokens: PartialTokenSet }) => {
    registerThemePreset('__preview__', tokens);
    setThemeRevision((revision) => revision + 1);
    setState((current) => ({ ...current, globe: { ...current.globe, theme: '__preview__' as ThemePresetName } }));
  }, []);

  const endThemePreview = useCallback(() => {
    const previous = previewPreviousThemeRef.current;
    previewPreviousThemeRef.current = null;
    unregisterThemePreset('__preview__');
    if (previous !== null) {
      setState((current) => ({ ...current, globe: { ...current.globe, theme: previous } }));
    }
  }, []);

  const activeInspectorItem = getStudioNavItem(activeInspector);

  return (
    <TooltipProvider>
      <main className="studio-workspace fixed inset-0 overflow-hidden bg-slate-950 text-slate-50" data-testid="studio-status" data-ready={status.ready}>
        <GlobePreview
          config={globeConfig}
          themeRevision={themeRevision}
          dataLayer={dataLayer}
          focus={{
            clickToFocus: state.globe.clickToFocus,
            padding: state.globe.focusPadding,
            durationMs: state.globe.focusDurationMs,
            elevation: state.globe.focusElevation,
            pauseAutoRotate: state.globe.focusPauseAutoRotate,
          }}
          onReady={setReady}
          onMessage={setRuntimeMessage}
          command={command}
        />
        <TopCommandBar
          state={state}
          customThemes={customThemes}
          customPresets={customPresets}
          ready={status.ready}
          onGlobeChange={updateGlobe}
          onPreset={applyPreset}
          onCreateTheme={() => openThemeEditor()}
          onSavePreset={() => setSavePresetModalOpen(true)}
          onManageSaved={() => setManageModalOpen(true)}
          onReplay={() => sendCommand('replay')}
          onHome={() => sendCommand('home')}
          onExport={() => setTransferMode('export')}
          onImport={() => setTransferMode('import')}
          onReset={reset}
          onCommandPalette={() => setCommandPaletteOpen(true)}
        />
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          state={state}
          customThemes={customThemes}
          customPresets={customPresets}
          onGlobeChange={updateGlobe}
          onPreset={applyPreset}
          onReplay={() => sendCommand('replay')}
          onHome={() => sendCommand('home')}
          onManageSaved={() => setManageModalOpen(true)}
          onExport={() => setTransferMode('export')}
          onImport={() => setTransferMode('import')}
          onReset={reset}
        />
        <CustomThemeModal
          open={themeModalOpen}
          onOpenChange={(next) => {
            setThemeModalOpen(next);
            if (!next) setEditingTheme(undefined);
          }}
          defaultBase={themeBase}
          editing={editingTheme}
          onPreview={previewTheme}
          onPreviewEnd={endThemePreview}
          onSaved={(theme) => {
            // Save path: drop the preview, theme is already registered
            // under its real id by saveCustomTheme. Apply it as the new
            // active theme + flag dirty so the preset selector knows.
            unregisterThemePreset('__preview__');
            previewPreviousThemeRef.current = null;
            setCustomThemes((current) => [
              theme,
              ...current.filter((t) => t.id !== theme.id),
            ]);
            updateGlobe({ theme: theme.id as never });
            setRuntimeMessage(
              editingTheme
                ? `Updated custom theme: ${theme.name}`
                : `Saved custom theme: ${theme.name}`
            );
          }}
        />
        <ManageSavedModal
          open={manageModalOpen}
          onOpenChange={setManageModalOpen}
          themes={customThemes}
          presets={customPresets}
          onEditTheme={openThemeEditor}
          onDeleteTheme={(id) => {
            const next = deleteCustomTheme(id);
            setCustomThemes(next);
            // If the deleted theme was active, fall back to the matching
            // built-in for the current kind so the globe doesn't render
            // a now-unregistered preset name.
            if (state.globe.theme === (id as ThemePresetName)) {
              updateGlobe({ theme: defaultThemeForKind[state.globe.kind] });
            }
            setRuntimeMessage('Custom theme deleted');
          }}
          onDeletePreset={(id) => {
            const next = deleteCustomPreset(id);
            setCustomPresets(next);
            setRuntimeMessage('Custom preset deleted');
          }}
        />
        <SavePresetModal
          open={savePresetModalOpen}
          onOpenChange={setSavePresetModalOpen}
          state={state}
          onSaved={(preset) => {
            setCustomPresets((current) => [
              preset,
              ...current.filter((p) => p.id !== preset.id),
            ]);
            // Mark this preset as the active one so the top-bar select
            // reads the user's new save instead of the previous active.
            setState((current) => ({
              ...current,
              lastPresetId: preset.id,
              dirtySincePreset: false,
            }));
            setRuntimeMessage(`Saved preset: ${preset.name}`);
          }}
        />
        <Panel
          id="stage"
          collapsed={compact ? mobilePanel !== 'stage' : undefined}
          onCollapsedChange={compact ? (closed) => setMobilePanel(closed ? null : 'stage') : undefined}
          position="left"
          title="Interactive Studio"
          icon={<Globe2 className="size-4" />}
          badge={`${state.globe.kind} · ${
            state.globe.theme.split('-').slice(-1)[0]
          }`}
          width={286}
        >
          <StagePanel
            state={state}
            active={activeInspector}
            onSelect={(id) => {
              setActiveInspector(id);
              if (compact) {
                setMobilePanel('inspector');
                requestAnimationFrame(() => document.getElementById('studio-panel-inspector-toggle')?.focus());
              }
            }}
          />
        </Panel>
        <Panel
          id="inspector"
          collapsed={compact ? mobilePanel !== 'inspector' : undefined}
          onCollapsedChange={compact ? (closed) => setMobilePanel(closed ? null : 'inspector') : undefined}
          position="right"
          title={activeInspectorItem.label}
          icon={
            <FontAwesomeIcon
              icon={activeInspectorItem.icon}
              className="size-3.5"
              style={{ color: activeInspectorItem.accent }}
            />
          }
          badge={activeInspectorItem.status(state)}
          width={326}
        >
          <StudioInspectorPanel
            active={activeInspector}
            state={state}
            heatmapLoading={heatmapDataset.loading}
            heatmapError={heatmapDataset.error}
            onGlobeChange={updateGlobe}
            onLayerChange={updateLayer}
            onHeatmapChange={updateHeatmap}
            onHexbinChange={updateHexbin}
            onChartsChange={updateCharts}
          />
        </Panel>
        {compact && <div className="studio-mobile-hint">Drag to rotate · Pinch to zoom</div>}
        <StatusDock status={status} onExport={() => setTransferMode('export')} />
        {transferMode && <Suspense fallback={<div className="studio-loading-dialog" role="status">Opening project tools…</div>}>
          <StudioTransferDialog mode={transferMode} state={state} customThemes={customThemes}
            heatmapData={heatmapDataset.data} heatmapLoading={heatmapDataset.loading}
            heatmapError={heatmapDataset.error} onClose={() => setTransferMode(null)} onImport={importProject} />
        </Suspense>}
      </main>
    </TooltipProvider>
  );
}
