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
      case 'selection':
        // @ts-ignore -- Wave D
        return ((await import('./presets/selection')) as { default: PresetModule }).default;
      case 'atmosphere':
        // @ts-ignore -- Wave F
        return ((await import('./presets/atmosphere')) as { default: PresetModule }).default;
      case 'crosshair':
        // @ts-ignore -- Wave F
        return ((await import('./presets/crosshair')) as { default: PresetModule }).default;
      case 'arcs':
        // @ts-ignore -- Wave F
        return ((await import('./presets/arcs')) as { default: PresetModule }).default;
      case 'markers':
        // @ts-ignore -- Wave F
        return ((await import('./presets/markers')) as { default: PresetModule }).default;
      default:
        return null;
    }
  } catch {
    // Module hasn't been authored yet — fall through to placeholder.
    return null;
  }
};
