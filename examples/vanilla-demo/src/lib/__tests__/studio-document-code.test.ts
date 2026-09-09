import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { defaultState } from '@/configurator/defaults';
import { createRuntimeExport, generateStudioCode } from '@/lib/studio-document';

describe('generated Studio integrations', () => {
  it('typechecks copied snippets and JSON against all four actual package APIs', () => {
    const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
    const directory = path.join(repository, 'examples/vanilla-demo/__generated_studio_test__');
    const vue = generateStudioCode('vue').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1];
    expect(vue).toBeTruthy();

    const files = new Map([
      [path.join(directory, 'globe.ts'), generateStudioCode('vanilla')],
      [path.join(directory, 'MyGlobe.tsx'), generateStudioCode('react')],
      [path.join(directory, 'MyVueGlobe.ts'), vue!],
      [path.join(directory, 'my-globe.component.ts'), generateStudioCode('angular')],
      [path.join(directory, 'globe-config.json'), JSON.stringify(createRuntimeExport({
        ...defaultState, activeLayer: 'charts', globe: { ...defaultState.globe, markerMode: 'cards' },
      }, []))],
    ]);

    const options: ts.CompilerOptions = {
      noEmit: true,
      strict: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      resolveJsonModule: true,
      esModuleInterop: true,
      experimentalDecorators: true,
      skipLibCheck: true,
      baseUrl: repository,
      paths: {
        ...Object.fromEntries(['core', 'react', 'vue', 'angular'].map((name) => [
          `@your-globe/${name}`, [`packages/${name}/src/index.ts`],
        ])),
        'vue': ['packages/vue/node_modules/vue/dist/vue.d.ts'],
        '@angular/core': ['packages/angular/node_modules/@angular/core/index.d.ts'],
      },
    };
    const host = ts.createCompilerHost(options);
    const originalRead = host.readFile;
    const originalExists = host.fileExists;
    const originalDirectoryExists = host.directoryExists;
    host.readFile = (filename) => files.get(filename) ?? originalRead(filename);
    host.fileExists = (filename) => files.has(filename) || originalExists(filename);
    host.directoryExists = (filename) => filename === directory || Boolean(originalDirectoryExists?.(filename));
    const program = ts.createProgram([...files.keys()], options, host);
    const errors = ts.getPreEmitDiagnostics(program).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    const messages = errors.map((diagnostic) => `${diagnostic.file?.fileName ?? ''}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
    expect(messages).toEqual([]);
  }, 20_000);
});
