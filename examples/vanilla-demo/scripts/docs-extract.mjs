// Extracts the public API surface of @your-globe/core (config keys, instance
// methods, events, types) and the framework wrappers' props from the
// TypeScript sources, using the TypeScript compiler API. The result is
// written to src/docs/generated/api.json and consumed by the documentation.
//
//   node scripts/docs-extract.mjs          # write api.json
//   node scripts/docs-extract.mjs --check  # exit 1 when api.json is stale
//
// A vitest (src/docs/__tests__/api-json.test.ts) runs the same extraction and
// fails when the committed file no longer matches the types.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const coreDir = path.join(repoRoot, 'packages', 'core');
const coreSrc = path.join(coreDir, 'src');
export const OUTPUT_PATH = path.join(here, '..', 'src', 'docs', 'generated', 'api.json');

/** Named types documented on their own pages (plus anything the config tree references). */
const TYPE_PAGES = [
  'CountryData',
  'CountryEvent',
  'CountryDataEntry',
  'CountryDataMap',
  'MarkerConfig',
  'MarkerEvent',
  'HtmlMarkerConfig',
  'ArcConfig',
  'SurfaceClickEvent',
  'StoryConfig',
  'SceneConfig',
  'StorySceneEvent',
  'StoryCompleteEvent',
  'FlyToOptions',
  'FocusOptions',
  'ScaleConfig',
  'SequentialScale',
  'DivergingScale',
  'ThresholdScale',
  'CategoricalScale',
  'ScalePalette',
  'ScalePaletteName',
  'LegendOptions',
  'LegendPosition',
  'LegendStyle',
  'ThemeConfig',
  'ThemeInput',
  'ThemePresetName',
  'PartialTokenSet',
  'EasingFunction',
  'EasingName',
  'ZoomMode',
  'GlobeKind',
  'GlobeMode',
  'LatLng',
  'ResolutionLevel',
  'DataLayer',
  'DataLayerType',
  'DataLayerEvents',
  'ChoroplethDataLayer',
  'BarsDataLayer',
  'BarsDataEntry',
  'ExtrudedDataLayer',
  'HeatmapDataLayer',
  'HeatmapDataEntry',
  'HexBinDataLayer',
  'HexBinDataEntry',
  'ChartsDataLayer',
  'ChartsDataEntry',
  'CinematicDataset',
  'CinematicCityLightDatum',
  'CinematicRouteDatum',
];

const MAX_DEPTH = 5;

const collapse = (text) => text.replace(/\s+/g, ' ').trim();

/** Keep paragraph breaks and bullet lines; collapse the rest of the whitespace. */
const normalizeDoc = (text) => {
  if (!text) return '';
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim());
  const out = [];
  let buf = [];
  const flush = () => {
    if (buf.length) out.push(buf.join(' '));
    buf = [];
  };
  for (const line of lines) {
    if (line === '') {
      flush();
      out.push('');
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      flush();
      buf.push(line.replace(/^[-*•]\s+/, '- '));
      continue;
    }
    buf.push(line);
  }
  flush();
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

// Only explicit values count. Phrases such as "Default angular influence"
// describe a field, not its default. Use @default for conditional prose.
const DEFAULT_RE = /\b[Dd]efaults?(?:\s+(?:to|is|are|value))?\s*:?\s*(`[^`]*`|'[^']*'|"[^"]*"|-?\d+(?:\.\d+)?(?:\s*(?:ms|px|s|%))?|true\b|false\b|null\b|\[[^\]]*\]|\{[^}]*\})/;

const INLINE_DEFAULT_RE = /\b(true|false|'[^']*'|-?\d[\d.]*)\s*\(default\)/;

export const parseDefault = (doc) => {
  const m = DEFAULT_RE.exec(doc) ?? INLINE_DEFAULT_RE.exec(doc);
  if (!m) return undefined;
  let value = m[1].trim();
  value = value.replace(/^`|`$/g, '').replace(/^"|"$/g, '');
  value = value.replace(/[.,;:]$/, '').trim();
  return value.length > 0 && value.length <= 80 ? value : undefined;
};

/** Object-typed entries render their members as a nested table; the type column just says so. */
const literalTypeText = (typeNode, sf) => {
  if (ts.isTypeLiteralNode(typeNode)) return 'object';
  if (ts.isUnionTypeNode(typeNode)) {
    return typeNode.types.map((t) => (ts.isTypeLiteralNode(t) ? 'object' : collapse(t.getText(sf)))).join(' | ');
  }
  return null;
};

const docInfo = (node) => {
  const jsDocs = ts.getJSDocCommentsAndTags(node).filter((d) => d.kind === ts.SyntaxKind.JSDoc);
  const text = normalizeDoc(jsDocs.map((d) => ts.getTextOfJSDocComment(d.comment) ?? '').join('\n\n'));
  const tags = {};
  for (const tag of ts.getJSDocTags(node)) {
    const name = tag.tagName.text;
    const comment = collapse(ts.getTextOfJSDocComment(tag.comment) ?? '');
    if (name === 'default' || name === 'defaultValue') tags.default = comment.replace(/^`|`$/g, '');
    else if (name === 'since') tags.since = comment;
    else if (name === 'kinds') tags.kinds = comment.split(/[\s,]+/).filter(Boolean);
    else if (name === 'deprecated') tags.deprecated = comment || 'deprecated';
  }
  return { text, tags };
};

const propName = (name, sf) => {
  const raw = ts.isIdentifier(name) || ts.isPrivateIdentifier(name) ? name.text : ts.isStringLiteral(name) ? name.text : name.getText(sf);
  return raw.replace(/^['"]|['"]$/g, '');
};

export function extract() {
  const configPath = ts.findConfigFile(coreDir, ts.sys.fileExists, 'tsconfig.json');
  const raw = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, path.dirname(configPath));
  const program = ts.createProgram({
    rootNames: [path.join(coreSrc, 'index.ts')],
    options: { ...parsed.options, noEmit: true, skipLibCheck: true },
  });
  // Binding sets parent pointers on every node, which `getText()` and the
  // JSDoc helpers rely on.
  program.getTypeChecker();

  /** name → declaration node (interfaces and type aliases declared in core/src). */
  const decls = new Map();
  for (const sf of program.getSourceFiles()) {
    if (!sf.fileName.startsWith(coreSrc)) continue;
    sf.forEachChild((node) => {
      if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && !decls.has(node.name.text)) {
        decls.set(node.name.text, { node, sf });
      }
    });
  }
  const getDecl = (name) => decls.get(name);
  const referenced = new Set();

  const collectReferences = (node) => {
    if (!node) return;
    if (ts.isTypeReferenceNode(node)) {
      const name = node.typeName.getText();
      if (getDecl(name)) referenced.add(name);
    }
    node.forEachChild(collectReferences);
  };

  const interfaceMembers = (decl, seen = new Set()) => {
    if (seen.has(decl.node.name.text)) return [];
    const visited = new Set([...seen, decl.node.name.text]);
    const inherited = (decl.node.heritageClauses ?? []).flatMap((clause) => clause.types.flatMap((type) => {
      const parent = getDecl(type.expression.getText(decl.sf));
      return parent && ts.isInterfaceDeclaration(parent.node) ? interfaceMembers(parent, visited) : [];
    }));
    const ownNames = new Set(decl.node.members.filter(ts.isPropertySignature).map((member) => propName(member.name, decl.sf)));
    return [...inherited.filter((member) => !ownNames.has(propName(member.name, member.getSourceFile()))), ...decl.node.members];
  };

  const typeText = (typeNode, sf) => {
    if (!typeNode) return 'unknown';
    return collapse(typeNode.getText(sf)).replace(/import\('[^']+'\)\./g, '');
  };

  /** Resolve the interface a type node points at, if any (unwrapping `| null | undefined`). */
  const referencedInterface = (typeNode) => {
    if (!typeNode) return null;
    if (ts.isTypeReferenceNode(typeNode)) {
      const name = typeNode.typeName.getText();
      const d = getDecl(name);
      if (d && ts.isInterfaceDeclaration(d.node) && typeNode.typeArguments === undefined) return { name, decl: d, nullable: false };
      return null;
    }
    if (ts.isUnionTypeNode(typeNode)) {
      const refs = typeNode.types.filter((t) => !(ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword) && t.kind !== ts.SyntaxKind.UndefinedKeyword);
      if (refs.length === 1) {
        const inner = referencedInterface(refs[0]);
        return inner ? { ...inner, nullable: true } : null;
      }
    }
    return null;
  };

  const arrayItem = (typeNode) => {
    if (!typeNode) return null;
    if (ts.isArrayTypeNode(typeNode)) return typeNode.elementType.getText();
    if (ts.isTypeReferenceNode(typeNode) && typeNode.typeArguments?.length === 1) {
      const name = typeNode.typeName.getText();
      if (name === 'ReadonlyArray' || name === 'Array') return typeNode.typeArguments[0].getText();
    }
    return null;
  };

  const members = (list, _sf, pathPrefix, depth, ancestors) => {
    const out = [];
    for (const m of list) {
      if (!ts.isPropertySignature(m)) continue;
      const sf = m.getSourceFile();
      collectReferences(m.type);
      const name = propName(m.name, sf);
      const fullPath = pathPrefix ? `${pathPrefix}.${name}` : name;
      const { text, tags } = docInfo(m);
      const entry = {
        name,
        path: fullPath,
        type: typeText(m.type, sf),
        optional: Boolean(m.questionToken),
        description: text,
      };
      if (tags.since) entry.since = tags.since;
      if (tags.kinds) entry.kinds = tags.kinds;
      if (tags.deprecated) entry.deprecated = tags.deprecated;

      const item = arrayItem(m.type);
      if (item && getDecl(item)) {
        entry.items = item;
        referenced.add(item);
      } else if (m.type && ts.isTypeLiteralNode(m.type) && depth < MAX_DEPTH) {
        entry.children = members(m.type.members, sf, fullPath, depth + 1, ancestors);
        entry.type = literalTypeText(m.type, sf);
      } else if (m.type && ts.isUnionTypeNode(m.type) && depth < MAX_DEPTH) {
        // `boolean | { ... }` style options: document the object branch inline.
        const literal = m.type.types.find((t) => ts.isTypeLiteralNode(t));
        const ref = referencedInterface(m.type);
        if (literal) {
          entry.children = members(literal.members, sf, fullPath, depth + 1, ancestors);
          entry.type = literalTypeText(m.type, sf);
        } else if (ref && !ancestors.has(ref.name) && depth < MAX_DEPTH) {
          entry.ref = ref.name;
          entry.children = members(interfaceMembers(ref.decl), ref.decl.sf, fullPath, depth + 1, new Set([...ancestors, ref.name]));
          if (!entry.description) entry.description = docInfo(ref.decl.node).text;
        }
      } else {
        const ref = referencedInterface(m.type);
        if (ref && !ancestors.has(ref.name) && depth < MAX_DEPTH) {
          entry.ref = ref.name;
          entry.children = members(interfaceMembers(ref.decl), ref.decl.sf, fullPath, depth + 1, new Set([...ancestors, ref.name]));
          if (!entry.description) entry.description = docInfo(ref.decl.node).text;
        } else if (m.type && ts.isTypeReferenceNode(m.type)) {
          const name = m.type.typeName.getText();
          if (getDecl(name)) referenced.add(name);
        }
      }
      // Scalars take their default from the `@default` tag or a "Default X" sentence;
      // objects only from the tag, because their prose describes their members.
      const def = tags.default ?? (entry.children ? undefined : parseDefault(text));
      if (def !== undefined) entry.default = def;
      out.push(entry);
    }
    return out;
  };

  // ---- GlobeConfig tree -------------------------------------------------
  const globeConfig = getDecl('GlobeConfig');
  if (!globeConfig) throw new Error('GlobeConfig not found');
  const config = members(globeConfig.node.members, globeConfig.sf, '', 0, new Set(['GlobeConfig']));

  // Defaults declared as objects in globe/defaults.ts.
  const defaultsFile = program.getSourceFile(path.join(coreSrc, 'globe', 'defaults.ts'));
  const defaultsByPath = new Map();
  if (defaultsFile) {
    const sections = { DEFAULT_PERFORMANCE: 'performance', DEFAULT_COUNTRIES: 'countries' };
    defaultsFile.forEachChild((node) => {
      if (!ts.isVariableStatement(node)) return;
      for (const decl of node.declarationList.declarations) {
        const prefix = sections[decl.name.getText()];
        if (!prefix || !decl.initializer || !ts.isObjectLiteralExpression(decl.initializer)) continue;
        for (const prop of decl.initializer.properties) {
          if (!ts.isPropertyAssignment(prop)) continue;
          const value = collapse(prop.initializer.getText(defaultsFile));
          if (value === '{}') continue;
          defaultsByPath.set(`${prefix}.${propName(prop.name, defaultsFile)}`, value);
        }
      }
    });
  }
  const applyDefaults = (entries) => {
    for (const e of entries) {
      if (e.default === undefined && defaultsByPath.has(e.path)) e.default = defaultsByPath.get(e.path);
      if (e.children) applyDefaults(e.children);
    }
  };
  applyDefaults(config);

  // ---- GlobeInstance methods --------------------------------------------
  const instanceDecl = getDecl('GlobeInstance');
  const instance = [];
  for (const m of instanceDecl.node.members) {
    if (!ts.isPropertySignature(m) || !m.type || !ts.isFunctionTypeNode(m.type)) continue;
    const sf = instanceDecl.sf;
    const fn = m.type;
    collectReferences(fn);
    const typeParams = fn.typeParameters ? `<${fn.typeParameters.map((p) => collapse(p.getText(sf))).join(', ')}>` : '';
    const params = fn.parameters.map((p) => collapse(p.getText(sf))).join(', ');
    const returns = typeText(fn.type, sf);
    const { text, tags } = docInfo(m);
    const name = propName(m.name, sf);
    const entry = {
      name,
      signature: `${name}${typeParams}(${params}): ${returns}`.replace(/import\('[^']+'\)\./g, ''),
      returns,
      description: text,
    };
    if (tags.since) entry.since = tags.since;
    if (tags.deprecated) entry.deprecated = tags.deprecated;
    instance.push(entry);
  }

  // ---- Events -----------------------------------------------------------
  const eventsDecl = getDecl('GlobeEvents');
  const events = [];
  for (const m of eventsDecl.node.members) {
    if (!ts.isPropertySignature(m) || !m.type || !ts.isFunctionTypeNode(m.type)) continue;
    const sf = eventsDecl.sf;
    const first = m.type.parameters[0];
    const payload = first ? typeText(first.type, sf) : 'void';
    const payloadRef = first?.type && ts.isTypeReferenceNode(first.type) ? first.type.typeName.getText() : undefined;
    if (payloadRef && getDecl(payloadRef)) referenced.add(payloadRef);
    if (first?.type && ts.isUnionTypeNode(first.type)) {
      for (const t of first.type.types) if (ts.isTypeReferenceNode(t) && getDecl(t.typeName.getText())) referenced.add(t.typeName.getText());
    }
    events.push({ name: propName(m.name, sf), handler: typeText(m.type, sf), payload, description: docInfo(m).text });
  }

  // ---- Named types ------------------------------------------------------
  const types = {};
  const wanted = [...TYPE_PAGES, ...referenced];
  const seen = new Set();
  while (wanted.length) {
    const name = wanted.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const d = getDecl(name);
    if (!d) continue;
    const { text } = docInfo(d.node);
    if (ts.isInterfaceDeclaration(d.node)) {
      const before = new Set(referenced);
      const entry = {
        name,
        kind: 'interface',
        description: text,
        extends: d.node.heritageClauses?.flatMap((h) => h.types.map((t) => collapse(t.getText(d.sf)))) ?? [],
        members: members(interfaceMembers(d), d.sf, '', 0, new Set([name])),
      };
      for (const extra of referenced) if (!before.has(extra)) wanted.push(extra);
      for (const ext of entry.extends) {
        const base = ext.replace(/<.*$/, '');
        if (getDecl(base)) wanted.push(base);
      }
      types[name] = entry;
    } else {
      const before = new Set(referenced);
      collectReferences(d.node.type);
      for (const extra of referenced) if (!before.has(extra)) wanted.push(extra);
      const aliasText = typeText(d.node.type, d.sf);
      const entry = { name, kind: 'alias', description: text, type: aliasText };
      if (ts.isUnionTypeNode(d.node.type)) {
        const variants = d.node.type.types.map((t) => collapse(t.getText(d.sf)));
        entry.variants = variants;
        for (const v of variants) if (getDecl(v)) wanted.push(v);
      }
      types[name] = entry;
    }
  }

  // ---- Wrapper surfaces -------------------------------------------------
  const wrappers = {
    react: extractReact(path.join(repoRoot, 'packages', 'react', 'src', 'Globe.tsx')),
    vue: extractVue(path.join(repoRoot, 'packages', 'vue', 'src', 'VueGlobe.ts')),
    angular: extractAngular(path.join(repoRoot, 'packages', 'angular', 'src', 'globe.component.ts')),
  };

  const countKeys = (entries) => entries.reduce((n, e) => n + 1 + (e.children ? countKeys(e.children) : 0), 0);
  const countDocumented = (entries) => entries.reduce((n, e) => n + (e.description ? 1 : 0) + (e.children ? countDocumented(e.children) : 0), 0);
  const corePkg = JSON.parse(readFileSync(path.join(coreDir, 'package.json'), 'utf8'));

  return {
    coreVersion: corePkg.version,
    stats: {
      configKeys: countKeys(config),
      configKeysDocumented: countDocumented(config),
      instanceMethods: instance.length,
      events: events.length,
      types: Object.keys(types).length,
    },
    config,
    instance,
    events,
    types,
    wrappers,
  };
}

const parseFile = (file) => {
  const source = readFileSync(file, 'utf8');
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
};

const walk = (node, visit) => {
  visit(node);
  node.forEachChild((child) => walk(child, visit));
};

function extractReact(file) {
  const sf = parseFile(file);
  const result = { forwardsWholeConfig: false, props: [], events: [], handle: [] };
  walk(sf, (node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'GlobeProps' && ts.isIntersectionTypeNode(node.type)) {
      for (const part of node.type.types) {
        if (ts.isTypeReferenceNode(part) && part.typeName.getText() === 'Omit') result.forwardsWholeConfig = true;
        if (ts.isTypeLiteralNode(part)) {
          for (const m of part.members) {
            if (!ts.isPropertySignature(m)) continue;
            const name = propName(m.name, sf);
            const type = collapse(m.type?.getText(sf) ?? 'unknown');
            if (/^on[A-Z]/.test(name)) result.events.push({ name, type });
            else result.props.push({ name, type });
          }
        }
      }
    }
    if (ts.isInterfaceDeclaration(node) && node.name.text === 'GlobeHandle') {
      for (const m of node.members) {
        if (ts.isPropertySignature(m)) result.handle.push({ name: propName(m.name, sf), type: collapse(m.type?.getText(sf) ?? '') });
      }
    }
  });
  return result;
}

function extractVue(file) {
  const sf = parseFile(file);
  const result = { props: [], events: [], exposed: [] };
  walk(sf, (node) => {
    if (ts.isPropertyAssignment(node) && ts.isObjectLiteralExpression(node.initializer)) {
      const key = propName(node.name, sf);
      if (key === 'props') {
        for (const p of node.initializer.properties) {
          if (!ts.isPropertyAssignment(p)) continue;
          let type = 'unknown';
          if (ts.isObjectLiteralExpression(p.initializer)) {
            const t = p.initializer.properties.find((q) => ts.isPropertyAssignment(q) && propName(q.name, sf) === 'type');
            if (t) {
              const text = collapse(t.initializer.getText(sf));
              const m = /PropType<(.+)>$/.exec(text);
              type = m ? m[1] : text.replace(/^\[?(String|Number|Boolean|Object|Array)\]?$/, (s) => s.toLowerCase());
            }
          }
          result.props.push({ name: propName(p.name, sf), type });
        }
      }
      if (key === 'emits') {
        for (const p of node.initializer.properties) {
          if (!ts.isPropertyAssignment(p)) continue;
          const fn = p.initializer;
          const params = ts.isArrowFunction(fn) ? fn.parameters.map((q) => collapse(q.getText(sf))).join(', ') : '';
          result.events.push({ name: propName(p.name, sf), payload: params || 'void' });
        }
      }
    }
    if (ts.isCallExpression(node) && node.expression.getText(sf) === 'expose' && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
      for (const p of node.arguments[0].properties) {
        if (ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p)) result.exposed.push(propName(p.name, sf));
      }
    }
  });
  return result;
}

function extractAngular(file) {
  const sf = parseFile(file);
  const result = { inputs: [], outputs: [], methods: [] };
  walk(sf, (node) => {
    if (ts.isPropertyDeclaration(node)) {
      const decorators = ts.getDecorators(node) ?? [];
      const names = decorators.map((d) => (ts.isCallExpression(d.expression) ? d.expression.expression.getText(sf) : d.expression.getText(sf)));
      const name = propName(node.name, sf);
      if (names.includes('Input')) result.inputs.push({ name, type: collapse(node.type?.getText(sf) ?? 'unknown') });
      if (names.includes('Output')) {
        const init = node.initializer ? collapse(node.initializer.getText(sf)) : '';
        const m = /EventEmitter<(.+)>/.exec(init);
        result.outputs.push({ name, payload: m ? m[1] : 'void' });
      }
    }
    if (ts.isMethodDeclaration(node) && node.parent && ts.isClassDeclaration(node.parent)) {
      const modifiers = ts.getModifiers(node) ?? [];
      const isPublic = !modifiers.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword);
      const name = propName(node.name, sf);
      if (isPublic && !name.startsWith('ng')) {
        result.methods.push({ name, signature: `${name}(${node.parameters.map((p) => collapse(p.getText(sf))).join(', ')}): ${collapse(node.type?.getText(sf) ?? 'void')}` });
      }
    }
  });
  return result;
}

export const serialize = (api) => `${JSON.stringify(api, null, 2)}\n`;

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const api = extract();
  const next = serialize(api);
  if (process.argv.includes('--check')) {
    const current = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, 'utf8') : '';
    if (current !== next) {
      console.error(`api.json is stale — run: node scripts/docs-extract.mjs`);
      process.exit(1);
    }
    console.log('api.json is up to date');
  } else {
    mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, next);
    console.log(`wrote ${path.relative(repoRoot, OUTPUT_PATH)}`, JSON.stringify(api.stats));
  }
}
