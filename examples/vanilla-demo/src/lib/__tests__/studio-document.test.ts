import { describe, expect, it } from 'vitest';
import { resolveTheme, type HeatmapDataEntry } from '@your-globe/core';

import { defaultState, configuratorPresets } from '@/configurator/defaults';
import { buildGlobeConfig } from '@/configurator/builders';
import { buildMarkerCards } from '@/configurator/layer-fixtures';
import type { ConfiguratorState } from '@/configurator/types';
import type { CustomTheme } from '@/lib/custom-themes';
import {
  createRuntimeExport,
  createStudioDocument,
  generateStudioCode,
  parseStudioDocument,
  serializeStudioDocument,
  STUDIO_DOCUMENT_MAX_BYTES,
  STUDIO_FRAMEWORKS,
} from '@/lib/studio-document';
import { buildMarkerCardHtml } from '@/lib/studio-document-markers';

const samples: readonly HeatmapDataEntry[] = [
  { position: [52.2, 21], value: 123, id: 'POL', name: 'Poland' },
  { position: [-40.4, 174.8], value: 4.7, radius: 0.1, weight: 0.6, animation: { delay: 12, enabled: false } },
];

const custom: CustomTheme = {
  id: 'custom-ocean', name: 'Ocean blue', extends: 'cinematic-night', createdAt: 1_000,
  tokens: { 'globe.surfaceColor': '#123456', 'atmosphere.color': '#abcdef' },
};
const customState = {
  ...defaultState,
  globe: { ...defaultState.globe, theme: custom.id },
} as ConfiguratorState;

const projectWith = (change: (value: any) => void): string => {
  const value = JSON.parse(serializeStudioDocument(createStudioDocument(defaultState)));
  change(value);
  return JSON.stringify(value);
};

describe('Studio projects', () => {
  it('roundtrips every editor setting, all built-in presets and dormant layer controls exactly', () => {
    const states = [defaultState, ...configuratorPresets.map((preset) => ({
      ...defaultState,
      ...preset.patch,
      globe: { ...defaultState.globe, ...preset.patch.globe },
      heatmap: { ...defaultState.heatmap, ...preset.patch.heatmap },
      hexbin: { ...defaultState.hexbin, ...preset.patch.hexbin },
      charts: { ...defaultState.charts, ...preset.patch.charts },
    }))];
    for (const state of states) {
      const doc = createStudioDocument(state, { heatmapData: samples });
      expect(parseStudioDocument(serializeStudioDocument(doc))).toEqual(doc);
      expect(doc.state).toEqual(state);
      expect(doc.state).not.toBe(state);
      expect(doc.heatmapData).toEqual(samples);
    }
  });

  it('embeds the selected custom theme and excludes unrelated local themes', () => {
    const doc = createStudioDocument(customState, {
      customThemes: [custom, { ...custom, id: 'custom-unrelated' }], heatmapData: samples,
    });
    expect(doc.customThemes).toEqual([custom]);
    expect(parseStudioDocument(serializeStudioDocument(doc))).toEqual(doc);
    expect(resolveTheme(custom.id)['globe.surfaceColor']).not.toBe('#123456');
  });

  it('preserves derived custom-theme metadata without depending on its original base', () => {
    const derived = { ...custom, extends: 'custom-deleted-base' } as unknown as CustomTheme;
    const doc = createStudioDocument(customState, { customThemes: [derived] });
    expect(parseStudioDocument(serializeStudioDocument(doc)).customThemes[0].extends).toBe('custom-deleted-base');
    expect(createRuntimeExport(customState, [], [derived]).globe.theme).toEqual({ tokens: derived.tokens });
  });

  it.each([
    ['unknown field', (doc: any) => { doc.state.globe.futureSetting = true; }, /futureSetting.*not supported/],
    ['missing required field', (doc: any) => { delete doc.state.globe.kind; }, /state.globe.kind/],
    ['wrong primitive', (doc: any) => { doc.state.globe.autoRotate = 'yes'; }, /autoRotate.*true or false/],
    ['unknown enum', (doc: any) => { doc.state.hexbin.dataset = 'mystery'; }, /hexbin.dataset.*choose/],
    ['invalid easing', (doc: any) => { doc.state.charts.animationEasing = 'bounce-typo'; }, /charts.animationEasing.*choose/],
    ['latitude bounds', (doc: any) => { doc.state.globe.initialLat = 91; }, /initialLat.*-90 and 90/],
    ['fractional resolution', (doc: any) => { doc.state.hexbin.resolution = 2.5; }, /resolution.*integer/],
    ['expensive resolution', (doc: any) => { doc.state.hexbin.resolution = 99; }, /resolution.*between/],
    ['inverted zoom', (doc: any) => { doc.state.globe.minZoom = 8; doc.state.globe.maxZoom = 2; }, /minZoom.*smaller/],
    ['missing custom tokens', (doc: any) => { doc.state.globe.theme = 'custom-missing'; }, /theme.*missing/],
    ['CSS injection', (doc: any) => { doc.state.globe.markerCardAccent = 'red;background:url(https://example.com)'; }, /expected a CSS color/],
    ['malformed data', (doc: any) => { doc.heatmapData = [{ position: [10, 200], value: 12 }]; }, /position\[1\]/],
    ['unsupported data', (doc: any) => { doc.heatmapData = [{ position: [10, 20], value: 12, surprise: true }]; }, /surprise.*not supported/],
    ['missing sample value', (doc: any) => { doc.heatmapData = [{ position: [10, 20] }]; }, /value.*finite number/],
  ])('rejects %s without dropping settings', (_name, change, message) => {
    expect(() => parseStudioDocument(projectWith(change))).toThrow(message);
  });

  it('rejects corrupt files, unknown versions, prototype keys and nonfinite JSON numbers', () => {
    expect(() => parseStudioDocument('{')).toThrow(/not valid JSON/);
    expect(() => parseStudioDocument('null')).toThrow(/JSON object/);
    expect(() => parseStudioDocument(projectWith((doc) => { doc.version = 99; }))).toThrow(/version.*99/);
    expect(() => parseStudioDocument('{"__proto__":{"polluted":true}}')).toThrow(/reserved object keys/);
    expect(() => parseStudioDocument('{"constructor":{}}')).toThrow(/reserved object keys/);
    const nonfinite = serializeStudioDocument(createStudioDocument(defaultState)).replace(/"maxFps":\s*\d+/, '"maxFps":1e400');
    expect(() => parseStudioDocument(nonfinite)).toThrow(/finite number/);
    expect({}).not.toHaveProperty('polluted');
  });

  it('rejects over-limit input before parsing it and recognizes legacy runtime exports', () => {
    expect(() => parseStudioDocument(' '.repeat(STUDIO_DOCUMENT_MAX_BYTES + 1))).toThrow(/exceeds 8 MB/);
    expect(() => parseStudioDocument(JSON.stringify(createRuntimeExport(defaultState, [])))).toThrow(/runtime JSON.*not an editable Studio project/);
  });

  it('keeps large saved snapshots within the same byte limit used for opening files', () => {
    const heatmapData = Array.from({ length: 60_000 }, () => ({ position: [10, 20] as const, value: 4, name: 'Earthquake observation recorded at a remote sensor' }));
    const document = createStudioDocument(defaultState, { heatmapData });
    const source = serializeStudioDocument(document);
    expect(new TextEncoder().encode(source).byteLength).toBeLessThanOrEqual(STUDIO_DOCUMENT_MAX_BYTES);
    expect(parseStudioDocument(source).heatmapData).toHaveLength(heatmapData.length);
  });

  it('rejects malformed custom tokens, duplicates and attempts to overwrite built-in IDs', () => {
    const json = serializeStudioDocument(createStudioDocument(customState, { customThemes: [custom] }));
    for (const [change, error] of [
      [(doc: any) => { doc.customThemes[0].tokens['globe.surfaceColor'] = 7; }, /surfaceColor.*string/],
      [(doc: any) => { doc.customThemes[0].tokens['new.token'] = true; }, /new.token.*not supported/],
      [(doc: any) => { doc.customThemes.push(doc.customThemes[0]); }, /duplicate theme ID/],
      [(doc: any) => { doc.customThemes[0].id = 'cinematic-night'; }, /IDs must start/],
    ] as const) {
      const doc = JSON.parse(json);
      change(doc);
      expect(() => parseStudioDocument(JSON.stringify(doc))).toThrow(error);
    }
  });
});

describe('runtime and code exports', () => {
  it('carries a custom theme outside the originating browser without registration', () => {
    const runtime = createRuntimeExport(customState, samples, [custom]);
    expect(runtime.globe.theme).toEqual({ tokens: custom.tokens });
    expect(resolveTheme(runtime.globe.theme)).toEqual(resolveTheme({ tokens: custom.tokens }));
    expect(() => createRuntimeExport(customState, [], [])).toThrow(/custom theme.*missing/);
  });

  it('serializes each data layer with its current data and retains HTML card content', () => {
    for (const activeLayer of ['heatmap', 'hexbin', 'charts', 'none'] as const) {
      const state = { ...defaultState, activeLayer, globe: { ...defaultState.globe, markerMode: 'cards' as const } };
      const runtime = createRuntimeExport(state, samples);
      expect(JSON.parse(JSON.stringify(runtime))).toEqual(runtime);
      expect(runtime.dataLayer?.type ?? null).toBe(activeLayer === 'none' ? null : activeLayer);
      if (runtime.dataLayer?.type === 'heatmap') expect(runtime.dataLayer.data).toEqual(samples);
      expect(runtime.globe.htmlMarkers?.[0].content).toEqual(buildMarkerCards(state.globe)[0].content);
      expect(runtime.globe.htmlMarkers?.[0].content).toContain('style=');
    }
  });

  it('escapes card labels and rejects CSS injection in generated card markup', () => {
    const card = buildMarkerCardHtml('<img src=x onerror=alert(1)>', 'callout', 'red;position:fixed');
    expect(card).toContain('&lt;img');
    expect(card).not.toContain('<img');
    expect(card).not.toContain('position:fixed');
  });

  it('keeps Earth assets relative and explains the companion config and assets', () => {
    const state = { ...defaultState, globe: { ...defaultState.globe, cinematicTextures: 'earth-2k' as const } };
    expect(createRuntimeExport(state, []).globe.cinematic?.textures?.day).toBe('/textures/earth/earth_atmos_2048.jpg');
    for (const framework of STUDIO_FRAMEWORKS) {
      const code = generateStudioCode(framework.id);
      expect(code).toContain("from './globe-config.json'");
      expect(code).toContain('public/textures/earth');
      expect(code).toContain('setDataLayer(config.dataLayer)');
    }
  });

  it('binds every exported globe setting to a real Angular wrapper input', () => {
    const code = generateStudioCode('angular');
    for (const key of Object.keys(buildGlobeConfig(defaultState))) {
      expect(code).toContain(`[${key}]="globeConfig.${key}"`);
    }
    expect(code).toContain('(globeError)="onError($event)"');
    expect(code).not.toContain('[config]');
  });
});
