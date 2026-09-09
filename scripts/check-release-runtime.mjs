#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

function parse(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) throw new Error(`Cannot parse version: ${version}`);
  return match.slice(1).map(Number);
}

function atLeast(actual, required) {
  for (let index = 0; index < required.length; index += 1) {
    if (actual[index] > required[index]) return true;
    if (actual[index] < required[index]) return false;
  }
  return true;
}

const nodeVersion = parse(process.versions.node);
const npmResult = spawnSync('npm', ['--version'], { encoding: 'utf8' });
if (npmResult.status !== 0) throw new Error('npm --version failed');
const npmVersion = parse(npmResult.stdout);

if (!atLeast(nodeVersion, [22, 14, 0])) {
  throw new Error(`npm trusted publishing requires Node >=22.14.0; found ${process.versions.node}`);
}
if (!atLeast(npmVersion, [11, 5, 1])) {
  throw new Error(`npm trusted publishing requires npm >=11.5.1; found ${npmResult.stdout.trim()}`);
}

console.log(`Release runtime OK: Node ${process.versions.node}, npm ${npmResult.stdout.trim()}`);
