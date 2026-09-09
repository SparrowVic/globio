#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';

const [outputPath, version] = process.argv.slice(2);
if (!outputPath || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '')) {
  throw new Error('Usage: node scripts/write-release-notes.mjs OUTPUT VERSION');
}

const packages = [
  'globiojs',
  '@globiojs/core',
  '@globiojs/react',
  '@globiojs/vue',
  '@globiojs/angular',
];
const links = packages.map(
  (name) => `- [\`${name}@${version}\`](https://www.npmjs.com/package/${name}/v/${version})`,
);

await writeFile(
  outputPath,
  `# GlobioJS ${version}\n\nPublished packages:\n\n${links.join('\n')}\n`,
);
