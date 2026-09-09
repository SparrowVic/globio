#!/usr/bin/env node

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findArtifact,
  packAndValidatePackages,
  readJson,
  ROOT,
  run,
  writeJson,
} from './lib/release-packages.mjs';

function parseArguments(args) {
  const options = { artifactsOnly: false, keep: false, output: undefined };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--artifacts-only') options.artifactsOnly = true;
    else if (argument === '--keep') options.keep = true;
    else if (argument === '--output') options.output = args[++index];
    else if (argument === '--help') {
      console.log('Usage: node scripts/package-smoke.mjs [--artifacts-only] [--output DIR] [--keep]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (args.at(-1) === '--output') throw new Error('--output requires a directory');
  return options;
}

function bin(directory, command) {
  return path.join(directory, 'node_modules', '.bin', process.platform === 'win32' ? `${command}.cmd` : command);
}

async function install(directory) {
  const cacheDirectory = path.join(directory, '.npm-cache');
  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      '--registry=https://registry.npmjs.org',
    ],
    {
      cwd: directory,
      env: { ...process.env, NPM_CONFIG_CACHE: cacheDirectory },
    },
  );
}

async function smokeCoreReactVue(artifacts, workDirectory) {
  const directory = path.join(workDirectory, 'consumer-js');
  const reactManifest = await readJson(path.join(ROOT, 'packages/react/package.json'));
  const vueManifest = await readJson(path.join(ROOT, 'packages/vue/package.json'));
  const coreManifest = await readJson(path.join(ROOT, 'packages/core/package.json'));
  const rootManifest = await readJson(path.join(ROOT, 'package.json'));

  await writeJson(path.join(directory, 'package.json'), {
    name: 'globiojs-packed-consumer',
    private: true,
    type: 'module',
    dependencies: {
      globiojs: `file:${findArtifact(artifacts, 'globiojs').tarball}`,
      '@globiojs/core': `file:${findArtifact(artifacts, '@globiojs/core').tarball}`,
      '@globiojs/react': `file:${findArtifact(artifacts, '@globiojs/react').tarball}`,
      '@globiojs/vue': `file:${findArtifact(artifacts, '@globiojs/vue').tarball}`,
      react: reactManifest.devDependencies?.react ?? '^18.2.0',
      three: coreManifest.devDependencies?.three ?? '^0.167.1',
      vue: vueManifest.devDependencies?.vue ?? '^3.4.0',
    },
    devDependencies: {
      '@types/react': reactManifest.devDependencies?.['@types/react'] ?? '^18.2.0',
      '@types/three': rootManifest.pnpm?.overrides?.['@types/three'] ?? '^0.167.0',
      typescript: coreManifest.devDependencies?.typescript ?? '^5.3.3',
    },
  });

  await writeFile(
    path.join(directory, 'smoke.mjs'),
    `import assert from 'node:assert/strict';
const [alias, core, react, vue] = await Promise.all([
  import('globiojs'),
  import('@globiojs/core'),
  import('@globiojs/react'),
  import('@globiojs/vue'),
]);
const docs = await import('@globiojs/core/docs/api.json', { with: { type: 'json' } });
assert.equal(typeof alias.createGlobe, 'function');
assert.equal(alias.createGlobe, core.createGlobe);
assert.equal(typeof react.Globe, 'object');
assert.ok(vue.VueGlobe);
assert.equal(typeof docs.default, 'object');
console.log('ESM imports: OK');
`,
  );
  await writeFile(
    path.join(directory, 'smoke.cjs'),
    `const assert = require('node:assert/strict');
const alias = require('globiojs');
const core = require('@globiojs/core');
const react = require('@globiojs/react');
const vue = require('@globiojs/vue');
assert.equal(typeof alias.createGlobe, 'function');
assert.equal(alias.createGlobe, core.createGlobe);
assert.equal(typeof react.Globe, 'object');
assert.ok(vue.VueGlobe);
console.log('CommonJS imports: OK');
`,
  );
  await writeFile(
    path.join(directory, 'consumer.ts'),
    `import { createGlobe as createAlias } from 'globiojs';
import { createGlobe, type GlobeConfig } from '@globiojs/core';
import { Globe, type GlobeProps } from '@globiojs/react';
import { VueGlobe } from '@globiojs/vue';

const aliasFactory: typeof createGlobe = createAlias;
const config: GlobeConfig = { container: document.createElement('div') };
const reactProps: GlobeProps = {};
void aliasFactory;
void config;
void reactProps;
void Globe;
void VueGlobe;
`,
  );
  await writeFile(
    path.join(directory, 'consumer.cts'),
    `import { createGlobe as createAlias } from 'globiojs';
import { createGlobe, type GlobeConfig } from '@globiojs/core';
import { Globe, type GlobeProps } from '@globiojs/react';
import { VueGlobe } from '@globiojs/vue';

const aliasFactory: typeof createGlobe = createAlias;
const config: GlobeConfig = { container: document.createElement('div') };
const reactProps: GlobeProps = {};
void aliasFactory;
void config;
void reactProps;
void Globe;
void VueGlobe;
`,
  );
  await writeJson(path.join(directory, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      lib: ['ES2022', 'DOM'],
      strict: true,
      skipLibCheck: false,
      noEmit: true,
    },
    include: ['consumer.ts', 'consumer.cts'],
  });

  await install(directory);
  run(process.execPath, ['smoke.mjs'], { cwd: directory });
  run(process.execPath, ['smoke.cjs'], { cwd: directory });
  run(bin(directory, 'tsc'), ['--project', 'tsconfig.json'], { cwd: directory });
}

async function smokeAngularAot(artifacts, workDirectory) {
  const directory = path.join(workDirectory, 'consumer-angular');
  const angularManifest = await readJson(path.join(ROOT, 'packages/angular/package.json'));
  const coreManifest = await readJson(path.join(ROOT, 'packages/core/package.json'));
  const rootManifest = await readJson(path.join(ROOT, 'package.json'));
  const angularVersion = angularManifest.devDependencies?.['@angular/core'] ?? '^17.0.0';

  await writeJson(path.join(directory, 'package.json'), {
    name: 'globiojs-angular-packed-consumer',
    private: true,
    type: 'module',
    dependencies: {
      '@globiojs/angular': `file:${findArtifact(artifacts, '@globiojs/angular').tarball}`,
      '@globiojs/core': `file:${findArtifact(artifacts, '@globiojs/core').tarball}`,
      '@angular/common': angularVersion,
      '@angular/compiler': angularVersion,
      '@angular/core': angularVersion,
      '@angular/platform-browser': angularVersion,
      rxjs: angularManifest.devDependencies?.rxjs ?? '^7.8.0',
      three: coreManifest.devDependencies?.three ?? '^0.167.1',
      'zone.js': angularManifest.devDependencies?.['zone.js'] ?? '^0.14.0',
    },
    devDependencies: {
      '@angular-devkit/build-angular': angularVersion,
      '@angular/cli': angularVersion,
      '@angular/compiler-cli': angularVersion,
      '@types/three': rootManifest.pnpm?.overrides?.['@types/three'] ?? '^0.167.0',
      typescript: angularManifest.devDependencies?.typescript ?? '^5.3.3',
    },
  });
  await writeJson(path.join(directory, 'angular.json'), {
    $schema: './node_modules/@angular/cli/lib/config/schema.json',
    version: 1,
    newProjectRoot: 'projects',
    projects: {
      smoke: {
        projectType: 'application',
        root: '',
        sourceRoot: 'src',
        architect: {
          build: {
            builder: '@angular-devkit/build-angular:browser',
            options: {
              outputPath: 'dist',
              index: 'src/index.html',
              main: 'src/main.ts',
              polyfills: [],
              tsConfig: 'tsconfig.app.json',
              assets: [],
              styles: [],
              scripts: [],
            },
            configurations: {
              production: {
                aot: true,
                optimization: true,
                buildOptimizer: true,
                outputHashing: 'all',
              },
            },
          },
        },
      },
    },
  });
  await writeJson(path.join(directory, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      lib: ['ES2022', 'DOM'],
      strict: true,
      experimentalDecorators: true,
      useDefineForClassFields: false,
      skipLibCheck: false,
    },
    angularCompilerOptions: {
      strictInjectionParameters: true,
      strictTemplates: true,
    },
  });
  await writeJson(path.join(directory, 'tsconfig.app.json'), {
    extends: './tsconfig.json',
    compilerOptions: { outDir: './out-tsc/app', types: [] },
    files: ['src/main.ts'],
  });
  await mkdir(path.join(directory, 'src'), { recursive: true });
  await writeFile(
    path.join(directory, 'src/index.html'),
    '<!doctype html><html><body><smoke-root></smoke-root></body></html>\n',
  );
  await writeFile(
    path.join(directory, 'src/main.ts'),
    `import 'zone.js';
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { GlobeComponent } from '@globiojs/angular';

@Component({
  selector: 'smoke-root',
  standalone: true,
  imports: [GlobeComponent],
  template: '<ng-globe [kind]="kind"></ng-globe>',
})
class SmokeComponent {
  readonly kind = 'cinematic' as const;
}

bootstrapApplication(SmokeComponent);
`,
  );

  await install(directory);
  run(bin(directory, 'ng'), ['build', '--configuration', 'production'], { cwd: directory });
}

const options = parseArguments(process.argv.slice(2));
const ownsOutput = !options.output;
const outputDirectory = options.output
  ? path.resolve(options.output)
  : await mkdtemp(path.join(tmpdir(), 'globiojs-package-smoke-'));
let succeeded = false;

try {
  const artifacts = await packAndValidatePackages(outputDirectory);
  console.table(
    artifacts.map(({ name, version, bytes, fileCount }) => ({ name, version, bytes, fileCount })),
  );

  if (!options.artifactsOnly) {
    const consumersDirectory = await mkdtemp(path.join(tmpdir(), 'globiojs-consumers-'));
    try {
      await smokeCoreReactVue(artifacts, consumersDirectory);
      await smokeAngularAot(artifacts, consumersDirectory);
    } finally {
      if (!options.keep) await rm(consumersDirectory, { recursive: true, force: true });
    }
  }

  await writeJson(
    path.join(outputDirectory, 'artifacts.json'),
    artifacts.map(({ name, version, tarball, bytes, fileCount }) => ({
      name,
      version,
      tarball: path.basename(tarball),
      bytes,
      fileCount,
    })),
  );
  succeeded = true;
  console.log(`Packed package smoke test passed: ${outputDirectory}`);
} finally {
  if (ownsOutput && !options.keep && succeeded) {
    await rm(outputDirectory, { recursive: true, force: true });
  } else if (!succeeded) {
    console.error(`Failed package artifacts were kept at: ${outputDirectory}`);
  }
}
