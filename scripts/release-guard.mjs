#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { PACKAGE_DEFINITIONS, readJson, ROOT } from './lib/release-packages.mjs';

if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REF !== 'refs/heads/main') {
  throw new Error(`Package releases must run from main; received ${process.env.GITHUB_REF}`);
}

const changesetDirectory = path.join(ROOT, '.changeset');
const pendingChangesets = existsSync(changesetDirectory)
  ? (await readdir(changesetDirectory)).filter(
      (file) => file.endsWith('.md') && file.toLowerCase() !== 'readme.md',
    )
  : [];
if (pendingChangesets.length > 0) {
  throw new Error(
    `Pending changesets found (${pendingChangesets.join(', ')}). Merge the Version Packages PR first.`,
  );
}

const versions = [];
for (const definition of PACKAGE_DEFINITIONS) {
  const manifest = await readJson(path.join(ROOT, definition.directory, 'package.json'));
  if (manifest.name !== definition.name) {
    throw new Error(`${definition.directory}: expected ${definition.name}, found ${manifest.name}`);
  }
  if (manifest.private === true) throw new Error(`${definition.name} is marked private`);
  versions.push(manifest.version);
}

if (new Set(versions).size !== 1) {
  throw new Error(`Fixed package versions do not match: ${versions.join(', ')}`);
}

console.log(`Release guard passed for version ${versions[0]}`);
