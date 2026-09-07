import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { FEATURES, getFeature } from '../features';
import { findConfigTipEntry, findTypeTipEntry } from '../../components/shared/components/feature-tip-data';
import api from '../generated/api.json';
import type { ApiJson } from '../generated/api-types';

const CONTROLS = new Set(['SliderField', 'SwitchField', 'ToggleField', 'SelectField', 'GroupedSelectField', 'ColorField', 'ColorListField', 'Field']);
const SCOPES = new Set(['PanelSection', 'FeatureScopeProvider']);
const STUDIO = path.resolve(__dirname, '../../components/studio');

const API = api as ApiJson;
const FEATURE_IDS = new Set(FEATURES.map((f) => f.id));

const tsxFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? tsxFiles(path.join(dir, d.name)) : d.name.endsWith('.tsx') ? [path.join(dir, d.name)] : []));

interface ControlUse {
  readonly file: string;
  readonly line: number;
  readonly name: string;
  readonly label: string | null;
  readonly feature: string | null;
  readonly configPath: string | null;
  readonly typePath: string | null;
  readonly settingsKeys: ReadonlyArray<string>;
  readonly scoped: boolean;
}

const tagName = (el: ts.JsxOpeningLikeElement): string => el.tagName.getText();

const attrString = (el: ts.JsxOpeningLikeElement, name: string): string | null => {
  for (const a of el.attributes.properties) {
    if (!ts.isJsxAttribute(a) || a.name.getText() !== name) continue;
    if (!a.initializer) return '';
    if (ts.isStringLiteral(a.initializer)) return a.initializer.text;
    if (ts.isJsxExpression(a.initializer) && a.initializer.expression && ts.isStringLiteral(a.initializer.expression)) return a.initializer.expression.text;
    return '<expr>';
  }
  return null;
};

/** Every control element in a file, with whether a scope element with a `feature` encloses it. */
const collect = (file: string): ControlUse[] => {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const uses: ControlUse[] = [];
  const walk = (node: ts.Node, scoped: boolean) => {
    let nextScoped = scoped;
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      if (SCOPES.has(tagName(opening)) && attrString(opening, 'feature') !== null) nextScoped = true;
    }
    const opening = ts.isJsxSelfClosingElement(node) ? node : ts.isJsxElement(node) ? node.openingElement : null;
    if (opening && CONTROLS.has(tagName(opening))) {
      uses.push({
        file: path.relative(STUDIO, file),
        line: sf.getLineAndCharacterOfPosition(opening.getStart()).line + 1,
        name: tagName(opening),
        label: attrString(opening, 'label'),
        feature: attrString(opening, 'feature'),
        configPath: attrString(opening, 'configPath'),
        typePath: attrString(opening, 'typePath'),
        settingsKeys: [...new Set(opening.attributes.properties.flatMap((attribute) => {
          if (!ts.isJsxAttribute(attribute) || !['onChange', 'colors', 'checked', 'value'].includes(attribute.name.getText())) return [];
          return [...attribute.getText().matchAll(/(?:settings|state\.globe)\.(\w+)/g)].map((match) => match[1]!);
        }))],
        scoped,
      });
    }
    node.forEachChild((child) => walk(child, nextScoped));
  };
  walk(sf, false);
  return uses;
};

describe('Studio help tips', () => {
  const sectionFiles = [...tsxFiles(path.join(STUDIO, 'sections')), ...tsxFiles(path.join(STUDIO, 'panels'))];
  const presetFiles = tsxFiles(path.join(STUDIO, 'workshop'));
  const uses = [...sectionFiles, ...presetFiles].flatMap(collect);

  it('every control in the sections and panels resolves a feature', () => {
    const uncovered = sectionFiles.flatMap(collect).filter((u) => !u.feature && !u.configPath && !u.scoped);
    expect(uncovered.map((u) => `${u.file}:${u.line} ${u.name} ${u.label ?? ''}`)).toEqual([]);
  });

  it('every explicit feature id exists in the registry', () => {
    const bad = uses.filter((u) => u.feature && u.feature !== '<expr>' && !FEATURE_IDS.has(u.feature));
    expect(bad.map((u) => `${u.file}:${u.line} feature=${u.feature}`)).toEqual([]);
  });

  it('every configPath exists in GlobeConfig', () => {
    const bad = uses.filter((u) => u.configPath && u.configPath !== '<expr>' && !findConfigTipEntry(API, u.configPath));
    expect(bad.map((u) => `${u.file}:${u.line} configPath=${u.configPath}`)).toEqual([]);
  });

  it('every typePath resolves a public API option', () => {
    const bad = uses.filter((u) => u.typePath && u.typePath !== '<expr>' && !findTypeTipEntry(API, u.typePath));
    expect(bad.map((u) => `${u.file}:${u.line} typePath=${u.typePath}`)).toEqual([]);
    for (const type of ['HexBinDataLayer', 'HeatmapDataLayer', 'ChartsDataLayer']) {
      for (const key of ['', '.style', '.order', '.easing', '.duration', '.stagger']) {
        expect(findTypeTipEntry(API, `${type}.animation${key}`), `${type}.animation${key}`).toBeDefined();
      }
    }
  });

  it('resolves array element fields and inherited method options without inventing config keys', () => {
    expect(findConfigTipEntry(API, 'markers[].pulse.speed')?.name).toBe('speed');
    expect(findConfigTipEntry(API, 'arcs[].height')?.type).toBe("number | 'auto'");
    expect(findTypeTipEntry(API, 'FocusOptions.duration')?.name).toBe('duration');
    expect(findConfigTipEntry(API, 'arcs[].missing')).toBeUndefined();
    expect(findConfigTipEntry(API, 'atmosphere[].color')).toBeUndefined();
    expect(findTypeTipEntry(API, 'HeatmapDataLayer.missing')).toBeUndefined();
  });

  it('controls bound to GlobeConfig settings name the exact field they edit', () => {
    const file = path.resolve(STUDIO, '../../configurator/builders.ts');
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const mappings = new Map<string, Set<string>>();
    const walk = (node: ts.Node, parts: ReadonlyArray<string>) => {
      const next = ts.isPropertyAssignment(node) ? [...parts, node.name.getText()] : parts;
      if (ts.isPropertyAccessExpression(node) && /^state\.globe\.\w+$/.test(node.getText())) {
        const configPath = next.join('.');
        if (findConfigTipEntry(API, configPath)) {
          const paths = mappings.get(node.name.text) ?? new Set<string>();
          paths.add(configPath);
          mappings.set(node.name.text, paths);
        }
      }
      node.forEachChild((child) => walk(child, next));
    };
    walk(source, []);
    mappings.set('starfieldMultiColor', new Set(['starfield.palette']));
    // These settings choose Studio fixtures or convert a UI value before export.
    const localSettings = new Set(['markerMode']);
    const unlinked = uses.filter((u) => u.settingsKeys.some((key) => mappings.has(key) && !localSettings.has(key)) && !u.configPath && !u.typePath);
    expect(unlinked.map((u) => `${u.file}:${u.line} ${u.label}`)).toEqual([]);
    const mismatched = uses.filter((u) => {
      if (!u.configPath || u.configPath === '<expr>') return false;
      const paths = u.settingsKeys.flatMap((key) => [...(mappings.get(key) ?? [])]);
      return paths.length > 0 && !paths.includes(u.configPath);
    });
    expect(mismatched.map((u) => `${u.file}:${u.line} ${u.configPath}`)).toEqual([]);
  });

  it('every literal scope feature exists, including scopes outside control elements', () => {
    const invalid: string[] = [];
    for (const file of tsxFiles(STUDIO)) {
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const walk = (node: ts.Node) => {
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && SCOPES.has(tagName(node))) {
          const feature = attrString(node, 'feature');
          if (feature && feature !== '<expr>' && !FEATURE_IDS.has(feature)) invalid.push(`${file}: ${feature}`);
        }
        node.forEachChild(walk);
      };
      walk(source);
    }
    expect(invalid).toEqual([]);
  });

  it('every illustrated tip module loads and exports a component', async () => {
    const withTips = FEATURES.filter((f) => f.tip);
    expect(withTips.length).toBeGreaterThanOrEqual(10);
    for (const f of withTips) {
      const mod = await f.tip!();
      expect(typeof mod.default, `${f.id} tip`).toBe('function');
    }
  });

  it('workshop presets are scoped by the configurator map', async () => {
    const { configuratorFeature, configuratorMeta } = await import('../../components/studio/workshop/configurators');
    for (const meta of configuratorMeta) {
      const feature = configuratorFeature[meta.id];
      expect(getFeature(feature), `${meta.id} → ${feature}`).toBeDefined();
    }
  });
});
