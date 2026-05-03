import type { ConfiguratorId, PresetModule } from './configurators';

/**
 * Lazy-resolves a configurator's preset module (cinematography + knobs +
 * hero extras). Returns `null` when the preset hasn't been authored yet
 * — Detail view falls back to a "coming soon" placeholder, lets us ship
 * picker + a handful of configurators per wave without a half-broken
 * Workshop.
 *
 * Bundlers (Vite, esbuild) need *literal* paths in dynamic imports for
 * static chunking + tree-shaking; computed paths force them to bundle
 * the whole `presets/` directory eagerly.
 */
export const loadPreset = async (id: ConfiguratorId): Promise<PresetModule | null> => {
  try {
    switch (id) {
      case 'labels':
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore -- preset file authored in Wave C
        return ((await import('./presets/labels')) as { default: PresetModule }).default;
      case 'pulse':
        // @ts-ignore -- Wave D
        return ((await import('./presets/pulse')) as { default: PresetModule }).default;
      case 'stars':
        // @ts-ignore -- Wave D
        return ((await import('./presets/stars')) as { default: PresetModule }).default;
      case 'hover':
        // @ts-ignore -- Wave D
        return ((await import('./presets/hover')) as { default: PresetModule }).default;
      case 'arcs':
      case 'markers':
      case 'atmosphere':
      case 'crosshair':
        return null;
      default:
        return null;
    }
  } catch {
    // Module hasn't been authored yet — fall through to placeholder.
    return null;
  }
};
