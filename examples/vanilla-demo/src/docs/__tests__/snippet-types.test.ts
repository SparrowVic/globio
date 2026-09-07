import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import * as snippets from '../snippets';
import * as recipes from '../recipes';
import type { FrameworkCode } from '../frameworks';

const docsRoot = fileURLToPath(new URL('..', import.meta.url));

/** Application-owned DOM, state and datasets used by the focused examples. */
const context = `
import type { GlobeInstance, CountryDataMap, HeatmapDataEntry, MarkerConfig, ScaleConfig, StoryConfig } from '@your-globe/core';
import type { GlobeHandle } from '@your-globe/react';
declare global {
  const globe: GlobeInstance;
  const createGlobe: typeof import('@your-globe/core').createGlobe;
  const Globe: typeof import('@your-globe/react').Globe;
  const useRef: typeof import('react').useRef;
  const useEffect: typeof import('react').useEffect;
  const ref: import('react').RefObject<GlobeHandle>;
  const container: HTMLElement;
  const tooltip: HTMLElement;
  const label: HTMLElement;
  const values: CountryDataMap;
  const scale: ScaleConfig;
  const points: ReadonlyArray<HeatmapDataEntry>;
  const markers: ReadonlyArray<MarkerConfig>;
  const story: StoryConfig;
  const ready: boolean;
  const playing: boolean;
  const live: boolean;
  const source: EventSource;
  const hero: HTMLElement;
  const next: HTMLElement;
  const caption: HTMLElement;
  const captions: Readonly<Record<string, string>>;
  const hubs: ReadonlyArray<MarkerConfig>;
  const routes: ReadonlyArray<import('@your-globe/core').ArcConfig>;
  const tokens: import('@your-globe/core').PartialTokenSet;
  const socket: { on(event: 'update', callback: (data: CountryDataMap) => void): void };
  function renderPanel(country: import('@your-globe/core').CountryData, value?: number): void;
  function setLive(live: boolean): void;
  function setHovered(name: string | null): void;
  function select(id: string): void;
  function setCaption(id: string, index?: number): void;
}
`;

const compileExamples = (examples: ReadonlyArray<readonly [string, string]>): string[] => {
  const files = new Map<string, string>([
    [resolve(docsRoot, '__snippet_context.d.ts'), context],
    ...examples.map(([name, source]) => [resolve(docsRoot, `__snippet_${name}.tsx`), `export {};\n${source}`] as const),
  ]);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    types: [],
    baseUrl: docsRoot,
    paths: {
      '@your-globe/core': [resolve(docsRoot, '../../../../packages/core/src/index.ts')],
      '@your-globe/react': [resolve(docsRoot, '../../../../packages/react/src/index.ts')],
    },
  };
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  host.readFile = (file) => files.get(file) ?? readFile(file);
  host.fileExists = (file) => files.has(file) || fileExists(file);
  host.getSourceFile = (file, languageVersion) => {
    const source = host.readFile(file);
    return source === undefined ? undefined : ts.createSourceFile(file, source, languageVersion, true);
  };
  const program = ts.createProgram([...files.keys()], options, host);
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const location = diagnostic.file && diagnostic.start !== undefined
      ? `${diagnostic.file.fileName.split('/').pop()}:${diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1}`
      : 'compiler';
    return `${location}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
  });
};

describe('documentation snippet types', () => {
  it('compiles shared Vanilla and React examples against the public packages', () => {
    const examples: Array<readonly [string, string]> = [];
    for (const [name, value] of Object.entries({ ...snippets, ...recipes })) {
      if (name === 'INSTALL' || typeof value !== 'object') continue;
      for (const framework of ['vanilla', 'react'] as const) {
        const source = (value as FrameworkCode)[framework];
        if (typeof source === 'string') examples.push([`${name}_${framework}`, source]);
      }
      // Framework templates use the same config types. Check their inline literal
      // bindings too; this catches misspelled inputs and invalid nested options.
      for (const framework of ['vue', 'angular'] as const) {
        const source = (value as FrameworkCode)[framework];
        if (typeof source !== 'string') continue;
        const pattern = framework === 'vue' ? /:([\w-]+)="([^"]+)"/g : /\[([\w]+)\]="([^"]+)"/g;
        let index = 0;
        for (const match of source.matchAll(pattern)) {
          const [, rawName, expression] = match;
          if (!rawName || !expression || !/^(?:[\[{]|true$|false$|[0-9])/.test(expression)) continue;
          const key = rawName.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
          examples.push([`${name}_${framework}_${index++}`, `const config: Omit<import('@your-globe/core').GlobeConfig, 'container'> = { ${key}: ${expression} };`]);
        }
      }
    }
    for (const framework of ['vanilla', 'react'] as const) {
      const source = snippets.kindSnippet('outline', 'outline-dark')[framework];
      if (source) examples.push([`kind_${framework}`, source]);
    }
    expect(examples.length).toBeGreaterThan(35);
    expect(compileExamples(examples)).toEqual([]);
  }, 60_000);

  it('rejects the former wrong event payload, scale prop and country entry shapes', () => {
    const errors = compileExamples([
      ['bad_event', `globe.on('surfaceClick', ({ lat, lng }) => globe.flyTo([lat, lng]));`],
      ['bad_scale', `<Globe scale={{ type: 'sequential', range: ['#000', '#fff'] }} />;`],
      ['bad_country_data', `globe.setCountryData({ '616': 82 });`],
      ['bad_handle', `ref.current?.instance.flyTo([52, 21]);`],
    ]);
    expect(errors.some((error) => error.includes('bad_event'))).toBe(true);
    expect(errors.some((error) => error.includes('bad_scale'))).toBe(true);
    expect(errors.some((error) => error.includes('bad_country_data'))).toBe(true);
    expect(errors.some((error) => error.includes('bad_handle'))).toBe(true);
  }, 60_000);
});
