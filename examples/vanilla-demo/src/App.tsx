import { useCallback, useEffect, useMemo, useState } from 'react';

import { Database, Globe2 } from 'lucide-react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { GlobePreview } from '@/components/GlobePreview';
import { Panel } from '@/components/panels/Panel';
import { StageSections } from '@/components/sections/StageSections';
import { DataSections, dataBadgeForState } from '@/components/sections/DataSections';
import { StatusDock } from '@/components/panels/StatusDock';
import { TopCommandBar } from '@/components/panels/TopCommandBar';
import { CustomThemeModal } from '@/components/CustomThemeModal';
import { SavePresetModal } from '@/components/SavePresetModal';
import { resetAllPanelState } from '@/hooks/usePanelState';
import { bootstrapCustomThemes, type CustomTheme } from '@/lib/custom-themes';
import { loadCustomPresets, type CustomPreset } from '@/lib/custom-presets';
import {
  buildDataLayer,
  buildGlobeConfig,
  dataSummaryForState,
  exportConfig,
  type DataLayerCallbacks,
} from '@/configurator/builders';
import { getChartDataset, getHeatmapDataset } from '@/configurator/datasets';
import { configuratorPresets, initialStateForPath } from '@/configurator/defaults';
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

const initialState = (): ConfiguratorState => initialStateForPath(window.location.pathname);

export default function App() {
  const [state, setState] = useState<ConfiguratorState>(initialState);
  // User-created themes — bootstrapped from localStorage on first paint
  // and registered with core's theme system synchronously so themed
  // selectors can resolve them on the very first render.
  const [customThemes, setCustomThemes] = useState<ReadonlyArray<CustomTheme>>(() =>
    bootstrapCustomThemes(),
  );
  const [customPresets, setCustomPresets] = useState<ReadonlyArray<CustomPreset>>(() =>
    loadCustomPresets(),
  );
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [savePresetModalOpen, setSavePresetModalOpen] = useState(false);
  const [heatmapDataset, setHeatmapDataset] = useState<HeatmapDatasetState>({
    id: state.heatmap.dataset,
    data: [],
    loading: true,
    error: null,
  });
  const [command, setCommand] = useState<{ readonly type: 'none' | 'replay' | 'home'; readonly nonce: number }>({
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
  }, [state.heatmap.dataset]);

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
            ? `Cell ${payload.cellIndex} / ${payload.empty ? 'empty' : payload.value.toFixed(2)} / ${payload.sampleCount} samples`
            : 'Hexbin hover cleared',
        }));
      },
      onHexbinClick: (payload) => {
        setStatus((current) => ({
          ...current,
          hover: `Clicked cell ${payload.cellIndex} at ${payload.position[0].toFixed(1)}, ${payload.position[1].toFixed(1)}`,
        }));
      },
      onChartsHover: (payload) => {
        const dataset = getChartDataset(state.charts.dataset);
        setStatus((current) => ({
          ...current,
          hover: payload
            ? `${payload.entry.label ?? payload.entry.id ?? 'Chart'} / ${
                dataset.series.find((series) => series.key === payload.seriesKey)?.label ??
                payload.seriesKey ??
                'value'
              }: ${payload.value}`
            : 'Charts hover cleared',
        }));
      },
      onChartsClick: (payload) => {
        setStatus((current) => ({
          ...current,
          hover: `Clicked ${payload.entry.label ?? payload.entry.id ?? 'chart'} / ${payload.value}`,
        }));
      },
      onHeatmapHover: (entry) => {
        setStatus((current) => ({
          ...current,
          hover: entry
            ? `${entry.name ?? entry.id ?? 'Heat point'} / ${entry.value.toFixed(2)}`
            : 'Heatmap hover cleared',
        }));
      },
      onHeatmapClick: (entry) => {
        setStatus((current) => ({
          ...current,
          hover: `Clicked ${entry.name ?? entry.id ?? 'heat point'} / ${entry.position[0].toFixed(1)}, ${entry.position[1].toFixed(1)}`,
        }));
      },
    }),
    [state.charts.dataset]
  );

  const globeConfig = useMemo(() => buildGlobeConfig(state), [state]);
  const dataLayer = useMemo(
    () => buildDataLayer(state, heatmapDataset.data, callbacks),
    [callbacks, heatmapDataset.data, state]
  );
  const exportedJson = useMemo(
    () => JSON.stringify(exportConfig(state, heatmapDataset.data), null, 2),
    [heatmapDataset.data, state]
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
  const markDirty = (current: ConfiguratorState): Pick<ConfiguratorState, 'dirtySincePreset'> =>
    current.lastPresetId ? { dirtySincePreset: true } : { dirtySincePreset: false };

  const updateGlobe = useCallback((patch: Partial<GlobeSettings>) => {
    setState((current) => ({
      ...current,
      ...markDirty(current),
      globe: { ...current.globe, ...patch },
    }));
  }, []);

  const updateHeatmap = useCallback((patch: Partial<HeatmapSettings>) => {
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
      // Built-in preset (partial patch onto current state).
      const builtIn = configuratorPresets.find((entry) => entry.id === id);
      if (builtIn) {
        setState((current) => ({
          ...current,
          activeLayer: builtIn.patch.activeLayer ?? current.activeLayer,
          globe: builtIn.patch.globe ? { ...current.globe, ...builtIn.patch.globe } : current.globe,
          heatmap: builtIn.patch.heatmap ? { ...current.heatmap, ...builtIn.patch.heatmap } : current.heatmap,
          hexbin: builtIn.patch.hexbin ? { ...current.hexbin, ...builtIn.patch.hexbin } : current.hexbin,
          charts: builtIn.patch.charts ? { ...current.charts, ...builtIn.patch.charts } : current.charts,
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
    [customPresets, setRuntimeMessage],
  );

  const sendCommand = useCallback((type: 'replay' | 'home') => {
    setCommand((current) => ({ type, nonce: current.nonce + 1 }));
  }, []);

  const copyJson = useCallback(() => {
    if (!navigator.clipboard) {
      setRuntimeMessage('Clipboard API unavailable');
      return;
    }
    void navigator.clipboard
      .writeText(exportedJson)
      .then(() => setRuntimeMessage('JSON copied'))
      .catch((error: unknown) => {
        setRuntimeMessage(error instanceof Error ? error.message : 'Copy failed');
      });
  }, [exportedJson, setRuntimeMessage]);

  const reset = useCallback(() => {
    setState(initialState());
    // Wipe persisted panel/section collapse states too — "Reset" should
    // give a fresh slate, not just rewind the data settings while leaving
    // a half-collapsed UI behind. Reload to re-hydrate panel defaults.
    resetAllPanelState();
    setRuntimeMessage('Configurator reset · reloading…');
    setTimeout(() => window.location.reload(), 200);
  }, [setRuntimeMessage]);

  return (
    <TooltipProvider>
      <main className="fixed inset-0 overflow-hidden bg-slate-950 text-slate-50">
        <GlobePreview
          config={globeConfig}
          dataLayer={dataLayer}
          onReady={setReady}
          onMessage={setRuntimeMessage}
          command={command}
        />
        <TopCommandBar
          state={state}
          customThemes={customThemes}
          customPresets={customPresets}
          onGlobeChange={updateGlobe}
          onPreset={applyPreset}
          onCreateTheme={() => setThemeModalOpen(true)}
          onSavePreset={() => setSavePresetModalOpen(true)}
          onReplay={() => sendCommand('replay')}
          onHome={() => sendCommand('home')}
          onExport={copyJson}
          onReset={reset}
        />
        <CustomThemeModal
          open={themeModalOpen}
          onOpenChange={setThemeModalOpen}
          defaultBase={state.globe.theme}
          onSaved={(theme) => {
            // Add to local list (already persisted + registered with core
            // by saveCustomTheme inside the modal) and apply it as the
            // active theme so the user sees their creation immediately.
            setCustomThemes((current) => [theme, ...current.filter((t) => t.id !== theme.id)]);
            updateGlobe({ theme: theme.id as never });
            setRuntimeMessage(`Saved custom theme: ${theme.name}`);
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
          position="left"
          title="Stage"
          icon={<Globe2 className="size-4" />}
          badge={`${state.globe.kind} · ${state.globe.theme.split('-').slice(-1)[0]}`}
          defaultCollapsed
          width={340}
        >
          <StageSections settings={state.globe} onChange={updateGlobe} />
        </Panel>
        <Panel
          id="data"
          position="right"
          title="Data Layer"
          icon={<Database className="size-4" />}
          badge={dataBadgeForState(state)}
          width={380}
        >
          <DataSections
            state={state}
            heatmapLoading={heatmapDataset.loading}
            heatmapError={heatmapDataset.error}
            onLayerChange={updateLayer}
            onHeatmapChange={updateHeatmap}
            onHexbinChange={updateHexbin}
            onChartsChange={updateCharts}
          />
        </Panel>
        <StatusDock status={status} exportedJson={exportedJson} />
      </main>
    </TooltipProvider>
  );
}
