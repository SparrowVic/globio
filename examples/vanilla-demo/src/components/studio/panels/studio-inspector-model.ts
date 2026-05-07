import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCompass,
  faCrosshairs,
  faDatabase,
  faGauge,
} from '@fortawesome/sharp-duotone-solid-svg-icons';

import { dataBadgeForState } from '@/components/studio/sections/DataSections';
import type { StageSectionId } from '@/components/studio/sections/StageSections';
import {
  configuratorMeta,
  type ConfiguratorId,
} from '@/components/studio/workshop/configurators';
import type { ConfiguratorState } from '@/configurator/types';

export type LayerInspectorId = `layer-${ConfiguratorId}`;
export type StudioInspectorId =
  | StageSectionId
  | LayerInspectorId
  | 'data-layer';

export interface StudioNavItem {
  readonly id: StudioInspectorId;
  readonly label: string;
  readonly icon: IconDefinition;
  readonly accent: string;
  readonly description: string;
  readonly status: (state: ConfiguratorState) => string;
}

export interface StudioNavGroup {
  readonly id: string;
  readonly label: string;
  readonly items: ReadonlyArray<StudioNavItem>;
}

export const sceneItems: ReadonlyArray<StudioNavItem> = [
  {
    id: 'stage-camera',
    label: 'Camera',
    icon: faCompass,
    accent: '#7dd3fc',
    description: 'Zoom, rotation, framing',
    status: (state) =>
      state.globe.autoRotate
        ? `auto · ${state.globe.zoomMode}`
        : `static · ${state.globe.zoomMode}`,
  },
  {
    id: 'stage-focus',
    label: 'Focus',
    icon: faCrosshairs,
    accent: '#f472b6',
    description: 'Click-to-focus behavior',
    status: (state) =>
      state.globe.clickToFocus
        ? `${(state.globe.focusPadding * 100).toFixed(0)}% pad`
        : 'off',
  },
  {
    id: 'stage-perf',
    label: 'Performance',
    icon: faGauge,
    accent: '#34d399',
    description: 'Resolution and frame budget',
    status: (state) =>
      `${state.globe.adaptiveQuality ? 'auto' : state.globe.pixelRatio} · ${
        state.globe.maxFps
      }fps`,
  },
];

export const layerItems: ReadonlyArray<StudioNavItem> = configuratorMeta.map(
  (meta) => ({
    id: `layer-${meta.id}` as LayerInspectorId,
    label: meta.name
      .replace('Country labels', 'Labels')
      .replace('Hover crosshair', 'Crosshair'),
    icon: meta.icon,
    accent: meta.accent,
    description: meta.description,
    status: meta.status,
  })
);

export const dataItem: StudioNavItem = {
  id: 'data-layer',
  label: 'Data layer',
  icon: faDatabase,
  accent: '#60a5fa',
  description: 'Heatmap, hexbin, charts',
  status: dataBadgeForState,
};

export const studioNavGroups: ReadonlyArray<StudioNavGroup> = [
  { id: 'scene', label: 'Scene', items: sceneItems },
  { id: 'layers', label: 'Canonical layers', items: layerItems },
  { id: 'data', label: 'Data', items: [dataItem] },
];

export const studioNavItems: ReadonlyArray<StudioNavItem> = [
  ...sceneItems,
  ...layerItems,
  dataItem,
];

export const getStudioNavItem = (id: StudioInspectorId): StudioNavItem =>
  studioNavItems.find((item) => item.id === id) ??
  layerItems[0] ??
  sceneItems[0]!;

export const layerIdFromInspector = (
  id: StudioInspectorId
): ConfiguratorId | null =>
  id.startsWith('layer-')
    ? (id.slice('layer-'.length) as ConfiguratorId)
    : null;
