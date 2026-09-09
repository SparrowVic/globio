import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

export const PACKAGE_DEFINITIONS = Object.freeze([
  { name: '@globiojs/core', directory: 'packages/core', kind: 'core' },
  { name: 'globiojs', directory: 'packages/globiojs', kind: 'alias' },
  { name: '@globiojs/react', directory: 'packages/react', kind: 'react' },
  { name: '@globiojs/vue', directory: 'packages/vue', kind: 'vue' },
  { name: '@globiojs/angular', directory: 'packages/angular', kind: 'angular', packFromDist: true },
]);

const FORBIDDEN_PUBLISHED_PATHS = [
  /(^|\/)(?:src|test|tests|coverage|node_modules)(?:\/|$)/i,
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)(?:tsconfig(?:\.[^/]+)?\.json|tsup\.config\.[^/]+|ng-package\.json)$/i,
  /\.(?:key|pem|p12)$/i,
];

function fail(message) {
  throw new Error(message);
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.quiet ? 'pipe' : 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = options.quiet
      ? `\n${result.stdout ?? ''}${result.stderr ?? ''}`.trimEnd()
      : '';
    fail(`${command} ${args.join(' ')} exited with ${result.status}.${details}`);
  }

  return result;
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(directory, entry.name), relativePath)));
    } else {
      files.push(relativePath);
    }
  }
  return files.sort();
}

function collectTargets(value, targets = []) {
  if (typeof value === 'string') targets.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectTargets(entry, targets));
  else if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectTargets(entry, targets));
  }
  return targets;
}

function firstTarget(value) {
  return collectTargets(value).find((target) => target.startsWith('./'));
}

function assertExportTarget(packageRoot, target, packageName) {
  if (!target.startsWith('./')) return;
  if (target.includes('..') || path.isAbsolute(target)) {
    fail(`${packageName}: export points outside the package: ${target}`);
  }

  if (target.includes('*')) {
    const prefix = target.slice(0, target.indexOf('*'));
    const prefixDirectory = prefix.endsWith('/') ? prefix : path.posix.dirname(prefix);
    const resolvedPrefix = path.resolve(packageRoot, prefixDirectory);
    if (!existsSync(resolvedPrefix)) {
      fail(`${packageName}: wildcard export has no published base path: ${target}`);
    }
    return;
  }

  if (!existsSync(path.resolve(packageRoot, target))) {
    fail(`${packageName}: export target is not present in the tarball: ${target}`);
  }
}

function assertRepository(manifest, packageName) {
  const repository =
    typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url;
  if (!repository || !/github\.com[/:]SparrowVic\/globiojs(?:\.git)?$/i.test(repository)) {
    fail(`${packageName}: repository must point to SparrowVic/globiojs`);
  }
}

function assertDependencyRange(range, label) {
  if (typeof range !== 'string' || range.length === 0 || range.startsWith('workspace:')) {
    fail(`${label} must contain a publishable semver range`);
  }
}

async function validatePackage(definition, packageRoot, tarballPath) {
  const manifestPath = path.join(packageRoot, 'package.json');
  if (!existsSync(manifestPath)) fail(`${definition.name}: tarball has no package.json`);
  const manifest = await readJson(manifestPath);

  if (manifest.name !== definition.name) {
    fail(`${definition.name}: packed manifest has unexpected name ${String(manifest.name)}`);
  }
  if (manifest.private === true) fail(`${definition.name}: packed manifest is private`);
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version ?? '')) {
    fail(`${definition.name}: invalid publish version ${String(manifest.version)}`);
  }
  if (manifest.license !== 'MIT') fail(`${definition.name}: expected MIT license metadata`);
  if (manifest.publishConfig?.access !== 'public') {
    fail(`${definition.name}: publishConfig.access must be public`);
  }
  assertRepository(manifest, definition.name);

  const serializedManifest = JSON.stringify(manifest);
  if (serializedManifest.includes('workspace:')) {
    fail(`${definition.name}: packed manifest still contains a workspace: protocol`);
  }

  const files = await listFiles(packageRoot);
  if (!files.some((file) => /^readme(?:\.[^/]+)?$/i.test(file))) {
    fail(`${definition.name}: README is not included in the tarball`);
  }
  if (!files.some((file) => /^licen[cs]e(?:\.[^/]+)?$/i.test(file))) {
    fail(`${definition.name}: license file is not included in the tarball`);
  }
  for (const file of files) {
    if (FORBIDDEN_PUBLISHED_PATHS.some((pattern) => pattern.test(file))) {
      fail(`${definition.name}: development or sensitive file was published: ${file}`);
    }
  }

  if (!manifest.exports?.['.']) fail(`${definition.name}: missing root export`);
  for (const target of collectTargets(manifest.exports)) {
    assertExportTarget(packageRoot, target, definition.name);
  }
  for (const field of ['main', 'module', 'types', 'typings']) {
    if (typeof manifest[field] === 'string') {
      assertExportTarget(packageRoot, manifest[field], definition.name);
    }
  }

  if (definition.kind === 'core') {
    const docsExport = manifest.exports?.['./docs/api.json'];
    const docsTarget = firstTarget(docsExport);
    if (!docsTarget) fail('@globiojs/core: missing ./docs/api.json export');
    const docsPath = path.resolve(packageRoot, docsTarget);
    assertExportTarget(packageRoot, docsTarget, definition.name);
    await readJson(docsPath);
  }

  if (definition.kind === 'alias') {
    assertDependencyRange(
      manifest.dependencies?.['@globiojs/core'],
      'globiojs: dependency on @globiojs/core',
    );
  }

  if (['react', 'vue', 'angular'].includes(definition.kind)) {
    assertDependencyRange(
      manifest.peerDependencies?.['@globiojs/core'],
      `${definition.name}: peer dependency on @globiojs/core`,
    );
  }

  if (definition.kind === 'angular') {
    const fesmFiles = files.filter((file) => /^fesm2022\/.*\.mjs$/.test(file));
    if (fesmFiles.length === 0) fail('@globiojs/angular: missing Angular FESM2022 output');
    let hasPartialDeclaration = false;
    for (const file of fesmFiles) {
      const source = await readFile(path.join(packageRoot, file), 'utf8');
      if (source.includes('ɵɵngDeclareComponent')) hasPartialDeclaration = true;
    }
    if (!hasPartialDeclaration) {
      fail('@globiojs/angular: output is not Angular partial-Ivy compiled');
    }
  }

  return {
    name: manifest.name,
    version: manifest.version,
    tarball: tarballPath,
    bytes: (await stat(tarballPath)).size,
    fileCount: files.length,
    manifest,
  };
}

export async function packAndValidatePackages(outputDirectory) {
  await mkdir(outputDirectory, { recursive: true });
  const existing = await readdir(outputDirectory);
  if (existing.length > 0) {
    fail(`Package output directory must be empty: ${outputDirectory}`);
  }

  const unpackedRoot = path.join(outputDirectory, 'unpacked');
  await mkdir(unpackedRoot);
  const artifacts = [];

  for (const definition of PACKAGE_DEFINITIONS) {
    const sourceDirectory = path.join(ROOT, definition.directory);
    const sourceManifestPath = path.join(sourceDirectory, 'package.json');
    if (!existsSync(sourceManifestPath)) fail(`Missing workspace: ${definition.directory}`);
    const sourceManifest = await readJson(sourceManifestPath);
    if (sourceManifest.name !== definition.name) {
      fail(`${definition.directory}: expected package name ${definition.name}`);
    }

    const packDirectory = definition.packFromDist
      ? path.join(sourceDirectory, 'dist')
      : sourceDirectory;
    if (!existsSync(path.join(packDirectory, 'package.json')) && definition.packFromDist) {
      fail(`${definition.name}: build output is missing at ${packDirectory}`);
    }

    const before = new Set((await readdir(outputDirectory)).filter((file) => file.endsWith('.tgz')));
    if (definition.packFromDist) {
      const npmCache = path.join(outputDirectory, '.npm-pack-cache');
      run('npm', ['pack', '.', '--pack-destination', outputDirectory], {
        cwd: packDirectory,
        env: { ...process.env, NPM_CONFIG_CACHE: npmCache },
      });
      await rm(npmCache, { recursive: true, force: true });
    } else {
      run('pnpm', ['pack', '--pack-destination', outputDirectory], { cwd: packDirectory });
    }
    const after = (await readdir(outputDirectory)).filter(
      (file) => file.endsWith('.tgz') && !before.has(file),
    );
    if (after.length !== 1) {
      fail(`${definition.name}: expected one tarball, found ${after.length}`);
    }

    const tarballPath = path.join(outputDirectory, after[0]);
    const unpackDirectory = path.join(
      unpackedRoot,
      definition.name.replaceAll('@', '').replaceAll('/', '-'),
    );
    await mkdir(unpackDirectory);
    run('tar', ['-xzf', tarballPath, '-C', unpackDirectory]);
    const packageRoot = path.join(unpackDirectory, 'package');
    artifacts.push(await validatePackage(definition, packageRoot, tarballPath));
  }

  const versions = new Set(artifacts.map((artifact) => artifact.version));
  if (versions.size !== 1) {
    fail(`Fixed package group has mismatched versions: ${[...versions].join(', ')}`);
  }

  await rm(unpackedRoot, { recursive: true, force: true });
  return artifacts;
}

export function findArtifact(artifacts, name) {
  const artifact = artifacts.find((candidate) => candidate.name === name);
  if (!artifact) fail(`Missing packed artifact for ${name}`);
  return artifact;
}

export async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await import('node:fs/promises').then(({ writeFile }) =>
    writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`),
  );
}
