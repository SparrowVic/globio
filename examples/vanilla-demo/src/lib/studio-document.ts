import { DEFAULT_TOKENS, type DataLayer, type HeatmapDataEntry } from '@your-globe/core';

import { exportConfig } from '@/configurator/builders';
import { defaultState } from '@/configurator/defaults';
import type { ConfiguratorState, GlobeRuntimeConfig } from '@/configurator/types';
import type { CustomTheme } from './custom-themes';
import { STUDIO_ENUMS, STUDIO_NUMBER_LIMITS } from './studio-document-schema';
import { isStudioColor } from './studio-document-markers';

export { generateStudioCode, STUDIO_FRAMEWORKS, type StudioFramework } from './studio-document-code';

export const STUDIO_DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;
export const STUDIO_DOCUMENT_FORMAT = 'globio-studio';
export const STUDIO_DOCUMENT_VERSION = 1;

export interface StudioDocument {
  readonly format: typeof STUDIO_DOCUMENT_FORMAT;
  readonly version: typeof STUDIO_DOCUMENT_VERSION;
  readonly state: ConfiguratorState;
  readonly customThemes: readonly CustomTheme[];
  /** Freeze live/random heatmap data at export time instead of refetching on import. */
  readonly heatmapData?: readonly HeatmapDataEntry[];
}

export interface RuntimeExport {
  readonly globe: GlobeRuntimeConfig;
  readonly dataLayer: DataLayer | null;
}

export class StudioDocumentError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'StudioDocumentError';
  }
}

const fail = (path: string, reason: string): never => {
  throw new StudioDocumentError(`${path}: ${reason}`);
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const objectAt = (value: unknown, path: string): Record<string, unknown> => {
  if (!isRecord(value)) return fail(path, 'expected a JSON object.');
  return value;
};

const keysAt = (value: Record<string, unknown>, allowed: readonly string[], path: string): void => {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`${path}.${key}`, 'this setting is not supported by this Studio version.');
  }
};

const numberAt = (
  value: unknown,
  path: string,
  min = -1_000_000,
  max = 1_000_000,
  integer = false,
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(path, 'expected a finite number.');
  }
  if (value < min || value > max || (integer && !Number.isInteger(value))) {
    return fail(path, `expected ${integer ? 'an integer' : 'a number'} between ${min} and ${max}.`);
  }
  return value;
};

const stringAt = (value: unknown, path: string, limit = 4096): string => {
  if (typeof value !== 'string') return fail(path, 'expected text.');
  if (value.length > limit) return fail(path, `text must be at most ${limit} characters.`);
  return value;
};

/** Reject malformed structures before any object merging or theme registration. */
const inspectJson = (value: unknown, path = 'project', depth = 0): void => {
  if (depth > 12) fail(path, 'JSON is nested too deeply.');
  if (typeof value === 'number' && !Number.isFinite(value)) fail(path, 'expected a finite number.');
  if (typeof value === 'string' && value.length > 8192) fail(path, 'text is too long.');
  if (Array.isArray(value)) {
    if (value.length > 100_000) fail(path, 'a maximum of 100,000 entries is supported.');
    value.forEach((entry, index) => inspectJson(entry, `${path}[${index}]`, depth + 1));
  } else if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) {
        fail(`${path}.${key}`, 'reserved object keys are not allowed.');
      }
      inspectJson(entry, `${path}.${key}`, depth + 1);
    }
  }
};

const choicesAt = (value: unknown, choices: readonly string[], path: string): void => {
  if (typeof value !== 'string' || !choices.includes(value)) {
    fail(path, `choose one of: ${choices.join(', ')}.`);
  }
};

const validateState = (value: unknown, customThemes: readonly CustomTheme[]): void => {
  const walk = (input: unknown, example: unknown, path: string): void => {
    if (path === 'globe.theme') {
      const theme = stringAt(input, 'state.globe.theme', 256);
      if (!STUDIO_ENUMS['globe.theme'].includes(theme) && !customThemes.some((entry) => entry.id === theme)) {
        fail('state.globe.theme', `the custom theme "${theme}" is missing. Save the project again with its theme included.`);
      }
      return;
    }
    if (path === 'lastPresetId') {
      if (input !== null) stringAt(input, 'state.lastPresetId', 120);
      return;
    }
    const choices = (STUDIO_ENUMS as Readonly<Record<string, readonly string[]>>)[path];
    if (choices) {
      choicesAt(input, choices, `state.${path}`);
      return;
    }
    if (Array.isArray(example)) {
      if (!Array.isArray(input) || input.length > 64) fail(`state.${path}`, 'expected a palette with at most 64 colors.');
      (input as unknown[]).forEach((entry, index) => {
        const color = stringAt(entry, `state.${path}[${index}]`, 128);
        if (!isStudioColor(color)) fail(`state.${path}[${index}]`, 'expected a CSS color.');
      });
    } else if (isRecord(example)) {
      const actual = objectAt(input, `state${path ? `.${path}` : ''}`);
      keysAt(actual, Object.keys(example), `state${path ? `.${path}` : ''}`);
      for (const [key, next] of Object.entries(example)) {
        walk(actual[key], next, path ? `${path}.${key}` : key);
      }
    } else if (typeof example === 'number') {
      const bounds = STUDIO_NUMBER_LIMITS[path];
      numberAt(input, `state.${path}`, ...(bounds ?? [-1_000_000, 1_000_000]));
    } else if (typeof example === 'string') {
      const text = stringAt(input, `state.${path}`);
      if (/(?:color|accent)$/i.test(path) && !isStudioColor(text)) fail(`state.${path}`, 'expected a CSS color, such as #67e8f9.');
    } else if (typeof example === 'boolean' && typeof input !== 'boolean') {
      fail(`state.${path}`, 'expected true or false.');
    }
  };
  walk(value, defaultState, '');
  const state = value as ConfiguratorState;
  if (state.globe.minZoom >= state.globe.maxZoom) {
    fail('state.globe.minZoom', 'must be smaller than maxZoom.');
  }
  for (const kind of ['outline', 'hologram', 'cinematic', 'paper'] as const) {
    if (state.globe[`${kind}PulseScaleMin`] > state.globe[`${kind}PulseScaleMax`]) {
      fail(`state.globe.${kind}PulseScaleMin`, `must not exceed ${kind}PulseScaleMax.`);
    }
  }
};

const validateThemes = (value: unknown): readonly CustomTheme[] => {
  if (!Array.isArray(value) || value.length > 32) return fail('customThemes', 'expected at most 32 embedded themes.');
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const path = `customThemes[${index}]`;
    const theme = objectAt(entry, path);
    keysAt(theme, ['id', 'name', 'extends', 'tokens', 'createdAt'], path);
    const id = stringAt(theme.id, `${path}.id`, 256);
    if (!/^custom-[a-z0-9][a-z0-9_-]*$/i.test(id)) {
      fail(`${path}.id`, 'custom theme IDs must start with "custom-" and contain letters, digits, hyphens or underscores.');
    }
    if (seen.has(id)) fail(`${path}.id`, `duplicate theme ID "${id}".`);
    seen.add(id);
    if (!stringAt(theme.name, `${path}.name`, 256).trim()) fail(`${path}.name`, 'enter a theme name.');
    const base = stringAt(theme.extends, `${path}.extends`, 256);
    // Informational only: stored tokens already define the actual theme.
    if (!STUDIO_ENUMS['globe.theme'].includes(base) && !/^custom-[a-z0-9][a-z0-9_-]*$/i.test(base)) {
      fail(`${path}.extends`, 'expected a built-in or custom theme ID.');
    }
    numberAt(theme.createdAt, `${path}.createdAt`, 0, Number.MAX_SAFE_INTEGER, true);
    const tokens = objectAt(theme.tokens, `${path}.tokens`);
    keysAt(tokens, Object.keys(DEFAULT_TOKENS), `${path}.tokens`);
    const defaults = DEFAULT_TOKENS as unknown as Readonly<Record<string, unknown>>;
    for (const [key, token] of Object.entries(tokens)) {
      const tokenPath = `${path}.tokens["${key}"]`;
      if (typeof token !== typeof defaults[key]) fail(tokenPath, `expected ${typeof defaults[key]}.`);
      if (typeof token === 'number') numberAt(token, tokenPath);
      if (typeof token === 'string') {
        stringAt(token, tokenPath, 512);
        if (/(?:color|accent)$/i.test(key) && !isStudioColor(token)) fail(tokenPath, 'expected a CSS color.');
      }
    }
  });
  return value as CustomTheme[];
};

const validatePosition = (value: unknown, path: string): void => {
  if (!Array.isArray(value) || value.length !== 2) return fail(path, 'expected [latitude, longitude].');
  numberAt(value[0], `${path}[0]`, -90, 90);
  numberAt(value[1], `${path}[1]`, -180, 180);
};

const validateHeatmapData = (value: unknown): void => {
  if (!Array.isArray(value) || value.length > 100_000) return fail('heatmapData', 'expected an array of at most 100,000 samples.');
  value.forEach((entry, index) => {
    const path = `heatmapData[${index}]`;
    const sample = objectAt(entry, path);
    keysAt(sample, ['position', 'value', 'id', 'name', 'radius', 'weight', 'animation'], path);
    validatePosition(sample.position, `${path}.position`);
    numberAt(sample.value, `${path}.value`, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    for (const key of ['id', 'name']) if (key in sample) stringAt(sample[key], `${path}.${key}`, 256);
    if ('radius' in sample) numberAt(sample.radius, `${path}.radius`, 0, Math.PI * 2);
    if ('weight' in sample) numberAt(sample.weight, `${path}.weight`, 0, 1_000_000);
    if ('animation' in sample && typeof sample.animation !== 'boolean') {
      const animation = objectAt(sample.animation, `${path}.animation`);
      keysAt(animation, ['enabled', 'style', 'duration', 'delay', 'stagger', 'easing', 'trigger', 'order', 'origin'], `${path}.animation`);
      if ('enabled' in animation && typeof animation.enabled !== 'boolean') fail(`${path}.animation.enabled`, 'expected true or false.');
      if ('style' in animation) choicesAt(animation.style, STUDIO_ENUMS['heatmap.animationStyle'], `${path}.animation.style`);
      if ('order' in animation) choicesAt(animation.order, STUDIO_ENUMS['heatmap.animationOrder'], `${path}.animation.order`);
      if ('easing' in animation) choicesAt(animation.easing, STUDIO_ENUMS['heatmap.animationEasing'], `${path}.animation.easing`);
      if ('trigger' in animation) choicesAt(animation.trigger, ['init', 'manual'], `${path}.animation.trigger`);
      for (const key of ['duration', 'delay', 'stagger']) {
        if (key in animation) numberAt(animation[key], `${path}.animation.${key}`, 0, 3_600_000);
      }
      if ('origin' in animation) validatePosition(animation.origin, `${path}.animation.origin`);
    }
  });
};

/** Parse only. The caller decides when to apply state and register imported themes. */
export const parseStudioDocument = (source: string): StudioDocument => {
  if (new TextEncoder().encode(source).byteLength > STUDIO_DOCUMENT_MAX_BYTES) {
    throw new StudioDocumentError('The project exceeds 8 MB. Use a smaller data snapshot.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new StudioDocumentError('This file is not valid JSON. Choose a .studio.json project saved by Studio.');
  }
  inspectJson(parsed);
  const document = objectAt(parsed, 'project');
  if ('globe' in document && 'dataLayer' in document && !('format' in document)) {
    throw new StudioDocumentError('This is runtime JSON for an application, not an editable Studio project. In Studio, use Save project to export a .studio.json file; runtime settings cannot be imported without losing editor settings.');
  }
  if (document.format !== STUDIO_DOCUMENT_FORMAT) fail('format', 'choose a Globio Studio .studio.json project.');
  if (document.version !== STUDIO_DOCUMENT_VERSION) fail('version', `this Studio supports project version 1, received ${String(document.version)}. Open it in the Studio version that saved it.`);
  keysAt(document, ['format', 'version', 'state', 'customThemes', 'heatmapData'], 'project');
  const themes = validateThemes(document.customThemes);
  validateState(document.state, themes);
  if ('heatmapData' in document) validateHeatmapData(document.heatmapData);
  return parsed as StudioDocument;
};

export const createStudioDocument = (
  state: ConfiguratorState,
  options: { readonly customThemes?: readonly CustomTheme[]; readonly heatmapData?: readonly HeatmapDataEntry[] } = {},
): StudioDocument => {
  const document: StudioDocument = {
    format: STUDIO_DOCUMENT_FORMAT,
    version: STUDIO_DOCUMENT_VERSION,
    state,
    customThemes: options.customThemes?.filter((theme) => theme.id === state.globe.theme) ?? [],
    ...(options.heatmapData !== undefined ? { heatmapData: options.heatmapData } : {}),
  };
  // Clone the snapshot and validate exports too: no silently dropped unsupported fields.
  return parseStudioDocument(JSON.stringify(document));
};

export const serializeStudioDocument = (document: StudioDocument): string => {
  const compact = JSON.stringify(document);
  const validated = parseStudioDocument(compact);
  const readable = JSON.stringify(validated, null, 2);
  // Formatting must never create a project larger than the import limit.
  return new TextEncoder().encode(readable).byteLength <= STUDIO_DOCUMENT_MAX_BYTES ? readable : compact;
};

/** Runtime JSON is separate from the editable project; custom themes carry their own tokens. */
export const createRuntimeExport = (
  state: ConfiguratorState,
  heatmapData: readonly HeatmapDataEntry[],
  customThemes: readonly CustomTheme[] = [],
): RuntimeExport => {
  const document = createStudioDocument(state, { customThemes, heatmapData });
  const runtime = exportConfig(document.state, document.heatmapData ?? []);
  const custom = document.customThemes.find((theme) => theme.id === document.state.globe.theme);
  return {
    ...runtime,
    globe: {
      ...runtime.globe,
      ...(custom ? { theme: { tokens: custom.tokens } } : {}),
    },
  };
};
