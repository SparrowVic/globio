import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const packageRoot = new URL('../dist/', import.meta.url);
const packageJsonUrl = new URL('package.json', packageRoot);
const packageJsonText = await readFile(packageJsonUrl, 'utf8');
const packageJson = JSON.parse(packageJsonText);

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Invalid Angular package: ${message}`);
  }
}

assert(packageJson.name === '@globiojs/angular', 'unexpected package name');
assert(packageJson.type === 'module', 'package must be ESM');
assert(packageJson.sideEffects === false, 'sideEffects must be false');
assert(!packageJsonText.includes('workspace:'), 'workspace protocol leaked into package.json');

const rootExport = packageJson.exports?.['.'];
assert(rootExport && typeof rootExport === 'object', 'missing root export');
assert(typeof rootExport.types === 'string', 'missing type declaration export');
assert(typeof rootExport.default === 'string', 'missing default ESM export');
assert(rootExport.default.startsWith('./fesm2022/'), 'default export is not an FESM2022 bundle');

const typesUrl = new URL(rootExport.types, packageRoot);
const bundleUrl = new URL(rootExport.default, packageRoot);
await Promise.all([
  access(typesUrl),
  access(bundleUrl),
  access(new URL('README.md', packageRoot)),
  access(new URL('LICENSE', packageRoot)),
]);

const publicApiUrl = new URL('public-api.d.ts', packageRoot);
const componentTypesUrl = new URL('globe.component.d.ts', packageRoot);
const [types, publicApi, componentTypes, bundle] = await Promise.all([
  readFile(typesUrl, 'utf8'),
  readFile(publicApiUrl, 'utf8'),
  readFile(componentTypesUrl, 'utf8'),
  readFile(bundleUrl, 'utf8'),
]);

assert(bundle.includes('\u0275\u0275ngDeclareComponent'), 'bundle is not partially compiled');
assert(!bundle.includes('\u0275\u0275defineComponent'), 'bundle contains fully compiled Ivy declarations');
assert(bundle.includes('@globiojs/core'), 'core dependency was bundled instead of remaining external');
assert(types.includes("export * from './public-api'"), 'generated index does not expose the public API');
assert(publicApi.includes('GlobeComponent'), 'GlobeComponent is missing from the public API');
assert(componentTypes.includes('export declare class GlobeComponent'), 'GlobeComponent declaration is missing');

console.log(`Verified Angular Package Format at ${fileURLToPath(packageRoot)}`);
