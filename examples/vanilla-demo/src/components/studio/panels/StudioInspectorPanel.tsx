import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/sharp-duotone-solid-svg-icons';

import {
  DataSections,
  type DataSectionsProps,
} from '@/components/studio/sections/DataSections';
import {
  CameraSection,
  FocusSection,
  PerformanceSection,
} from '@/components/studio/sections/StageSections';
import { loadPreset } from '@/components/studio/workshop/preset-loader';
import type { PresetModule } from '@/components/studio/workshop/configurators';
import type { GlobeSettings } from '@/configurator/types';

import {
  layerIdFromInspector,
  type StudioInspectorId,
} from './studio-inspector-model';

export interface StudioInspectorPanelProps extends DataSectionsProps {
  readonly active: StudioInspectorId;
  readonly onGlobeChange: (patch: Partial<GlobeSettings>) => void;
}

export function StudioInspectorPanel({
  active,
  state,
  heatmapLoading,
  heatmapError,
  onGlobeChange,
  onLayerChange,
  onHeatmapChange,
  onHexbinChange,
  onChartsChange,
}: StudioInspectorPanelProps) {
  const layerId = layerIdFromInspector(active);
  const [preset, setPreset] = useState<PresetModule | null | 'loading'>(
    layerId ? 'loading' : null
  );

  useEffect(() => {
    if (!layerId) {
      setPreset(null);
      return undefined;
    }
    let cancelled = false;
    setPreset('loading');
    void loadPreset(layerId).then((next) => {
      if (!cancelled) setPreset(next);
    });
    return () => {
      cancelled = true;
    };
  }, [layerId]);

  if (active === 'stage-camera') {
    return <CameraSection settings={state.globe} onChange={onGlobeChange} />;
  }

  if (active === 'stage-focus') {
    return <FocusSection settings={state.globe} onChange={onGlobeChange} />;
  }

  if (active === 'stage-perf') {
    return (
      <PerformanceSection settings={state.globe} onChange={onGlobeChange} />
    );
  }

  if (active === 'data-layer') {
    return (
      <DataSections
        state={state}
        heatmapLoading={heatmapLoading}
        heatmapError={heatmapError}
        onLayerChange={onLayerChange}
        onHeatmapChange={onHeatmapChange}
        onHexbinChange={onHexbinChange}
        onChartsChange={onChartsChange}
      />
    );
  }

  if (preset === 'loading') {
    return (
      <div className="studio-inspector-state">
        <FontAwesomeIcon
          icon={faSpinnerThird}
          className="size-4 animate-spin text-amber-200"
        />
        <span>Loading controls</span>
      </div>
    );
  }

  if (!preset) {
    return (
      <div className="studio-inspector-state">
        <span>No controls are available for this layer yet.</span>
      </div>
    );
  }

  const Knobs = preset.KnobsComponent;
  return (
    <div className="studio-inspector-form">
      <Knobs state={state} onGlobeChange={onGlobeChange} />
    </div>
  );
}
