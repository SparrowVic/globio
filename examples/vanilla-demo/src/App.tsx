import { useCallback, useEffect, useMemo, useState } from 'react';

import { Database, Globe2 } from 'lucide-react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { GlobePreview } from '@/components/GlobePreview';
import { Panel } from '@/components/panels/Panel';
import { StageSections } from '@/components/sections/StageSections';
import { DataSections, dataBadgeForState } from '@/components/sections/DataSections';
import { StatusDock } from '@/components/panels/StatusDock';
import { TopCommandBar } from '@/components/panels/TopCommandBar';
import { resetAllPanelState } from '@/hooks/usePanelState';
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

  const updateGlobe = useCallback((patch: Partial<GlobeSettings>) => {
    setState((current) => ({ ...current, globe: { ...current.globe, ...patch } }));
  }, []);

  const updateHeatmap = useCallback((patch: Partial<HeatmapSettings>) => {
    setState((current) => ({ ...current, heatmap: { ...current.heatmap, ...patch } }));
  }, []);

  const updateHexbin = useCallback((patch: Partial<HexbinSettings>) => {
    setState((current) => ({ ...current, hexbin: { ...current.hexbin, ...patch } }));
  }, []);

  const updateCharts = useCallback((patch: Partial<ChartsSettings>) => {
    setState((current) => ({ ...current, charts: { ...current.charts, ...patch } }));
  }, []);

  const updateLayer = useCallback((activeLayer: ActiveLayer) => {
    setState((current) => ({ ...current, activeLayer }));
  }, []);

  const applyPreset = useCallback((id: string) => {
    const preset = configuratorPresets.find((entry) => entry.id === id);
    if (!preset) return;
    setState((current) => ({
      ...current,
      activeLayer: preset.patch.activeLayer ?? current.activeLayer,
      globe: preset.patch.globe ? { ...current.globe, ...preset.patch.globe } : current.globe,
      heatmap: preset.patch.heatmap ? { ...current.heatmap, ...preset.patch.heatmap } : current.heatmap,
      hexbin: preset.patch.hexbin ? { ...current.hexbin, ...preset.patch.hexbin } : current.hexbin,
      charts: preset.patch.charts ? { ...current.charts, ...preset.patch.charts } : current.charts,
    }));
    setRuntimeMessage(`Preset applied: ${preset.label}`);
  }, [setRuntimeMessage]);

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
          onPreset={applyPreset}
          onReplay={() => sendCommand('replay')}
          onHome={() => sendCommand('home')}
          onExport={copyJson}
          onReset={reset}
        />
        <Panel
          id="stage"
          position="left"
          title="Stage"
          icon={<Globe2 className="size-4" />}
          badge={`${state.globe.kind} · ${state.globe.theme.split('-').slice(-1)[0]}`}
          width={360}
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
