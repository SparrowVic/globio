import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const demo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(demo, 'dist');
const html = await readFile(resolve(dist, 'index.html'), 'utf8');
const assets = await readdir(resolve(dist, 'assets'));
const entry = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
if (!entry) throw new Error('Build the demo first; dist/index.html has no JavaScript entry.');

const modules = new Map();
async function visit(path) {
  if (modules.has(path)) return;
  const source = await readFile(path, 'utf8');
  modules.set(path, { path: relative(dist, path), bytes: Buffer.byteLength(source), gzipBytes: gzipSync(source).byteLength });
  // Vite/Rollup emits static imports at module scope. Dynamic import(...) of
  // the engine is deliberately excluded from this shell + home budget.
  for (const match of source.matchAll(/(?:^|[;\n])\s*(?:import|export)\s*(?:[^"';()]*?\bfrom\s*)?["']([^"']+)["']/g)) {
    if (match[1].startsWith('.') && match[1].endsWith('.js')) await visit(resolve(dirname(path), match[1]));
  }
}
await visit(resolve(dist, entry.replace(/^\//, '')));
for (const file of assets.filter((name) => /^Home-[\w-]+\.js$/.test(name))) await visit(resolve(dist, 'assets', file));
const graph = [...modules.values()];
const chunks = await Promise.all(assets.filter((name) => name.endsWith('.js')).map(async (name) => {
  const contents = await readFile(resolve(dist, 'assets', name));
  return { path: `assets/${name}`, bytes: contents.byteLength, gzipBytes: gzipSync(contents).byteLength };
}));
const report = {
  description: 'Production shell + homepage static dependency graph. Engine download is measured separately in browser samples.',
  shellAndHomeBytes: graph.reduce((total, file) => total + file.bytes, 0),
  shellAndHomeGzipBytes: graph.reduce((total, file) => total + file.gzipBytes, 0),
  largestJavaScriptChunk: chunks.sort((a, b) => b.bytes - a.bytes)[0],
  modules: graph,
  budgets: { shellAndHomeBytes: 450 * 1024, shellAndHomeGzipBytes: 150 * 1024, largestChunkBytes: 1250 * 1024 },
};
const output = resolve(demo, 'output/playwright/performance');
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'bundle.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
const exceeded = report.shellAndHomeBytes > report.budgets.shellAndHomeBytes
  || report.shellAndHomeGzipBytes > report.budgets.shellAndHomeGzipBytes
  || report.largestJavaScriptChunk.bytes > report.budgets.largestChunkBytes;
if (exceeded) throw new Error('Production JavaScript exceeded the documented performance budget.');
