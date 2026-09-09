#!/usr/bin/env node

import { run } from './lib/release-packages.mjs';

run('pnpm', ['exec', 'changeset', 'version']);
run('pnpm', ['docs:check']);
run(process.execPath, ['--test', 'scripts/docs-extract.test.mjs']);
run('pnpm', ['--recursive', '--filter', './packages/*', '--if-present', 'run', 'typecheck']);
run('pnpm', ['--recursive', '--filter', './packages/*', '--if-present', 'run', 'test']);
run('pnpm', ['--recursive', '--filter', './packages/*', '--if-present', 'run', 'build']);
run(process.execPath, ['scripts/package-smoke.mjs']);

