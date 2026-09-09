#!/usr/bin/env node

import { appendFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { packAndValidatePackages, run } from './lib/release-packages.mjs';

const REGISTRY = 'https://registry.npmjs.org';

function parseArguments(args) {
  const options = { publish: false, bootstrap: false, tag: 'latest' };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--publish') options.publish = true;
    else if (argument === '--bootstrap') options.bootstrap = true;
    else if (argument === '--tag') options.tag = args[++index];
    else if (argument === '--help') {
      console.log('Usage: node scripts/publish-packages.mjs [--publish] [--bootstrap] [--tag latest|next]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!['latest', 'next'].includes(options.tag)) throw new Error('--tag must be latest or next');
  return options;
}

async function versionExists(name, version) {
  const response = await fetch(`${REGISTRY}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`, {
    headers: { accept: 'application/json' },
  });
  if (response.status === 200) return true;
  if (response.status === 404) return false;
  throw new Error(`Registry check for ${name}@${version} returned HTTP ${response.status}`);
}

async function writeOutputs(published, version) {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(process.env.GITHUB_OUTPUT, `published-packages=${JSON.stringify(published)}\n`);
  await appendFile(process.env.GITHUB_OUTPUT, `release-version=${version}\n`);
}

const options = parseArguments(process.argv.slice(2));
if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REF !== 'refs/heads/main') {
  throw new Error('Publishing is restricted to the main branch');
}
if (options.publish && process.env.GITHUB_ACTIONS !== 'true' && !options.bootstrap) {
  throw new Error('Local publishing is disabled. The one-time owner bootstrap requires --bootstrap.');
}
if (options.bootstrap && process.env.GITHUB_ACTIONS === 'true') {
  throw new Error('--bootstrap is only for the first local owner publication');
}
if (options.bootstrap && process.env.GLOBIOJS_BOOTSTRAP_CONFIRM !== 'PUBLISH_FIRST_RELEASE') {
  throw new Error('Set GLOBIOJS_BOOTSTRAP_CONFIRM=PUBLISH_FIRST_RELEASE for the one-time bootstrap');
}
if (options.bootstrap) run('npm', ['whoami', `--registry=${REGISTRY}`]);

const outputDirectory = await mkdtemp(path.join(tmpdir(), 'globiojs-publish-'));
try {
  const artifacts = await packAndValidatePackages(outputDirectory);
  const version = artifacts[0].version;
  const prerelease = version.includes('-');
  if (options.tag === 'latest' && prerelease) {
    throw new Error(`Refusing to publish prerelease ${version} under the latest tag`);
  }

  const pending = [];
  for (const artifact of artifacts) {
    if (!(await versionExists(artifact.name, artifact.version))) pending.push(artifact);
  }

  if (!options.publish) {
    console.log(
      pending.length === 0
        ? `All packages at ${version} are already published.`
        : `Dry run: ${pending.map(({ name }) => `${name}@${version}`).join(', ')} would publish as ${options.tag}.`,
    );
    await writeOutputs([], version);
    process.exit(0);
  }

  const published = [];
  for (const artifact of pending) {
    const publishArguments = [
      'publish',
      artifact.tarball,
      '--access',
      'public',
      '--tag',
      options.tag,
      `--registry=${REGISTRY}`,
    ];
    if (!options.bootstrap) publishArguments.push('--provenance');
    run('npm', publishArguments);
    published.push({ name: artifact.name, version: artifact.version });
  }

  await writeOutputs(published, version);
  console.log(
    published.length === 0
      ? `Nothing to publish for ${version}.`
      : `Published ${published.map(({ name }) => `${name}@${version}`).join(', ')}.`,
  );
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}
