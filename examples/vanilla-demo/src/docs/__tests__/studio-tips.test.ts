import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { FEATURES, getFeature } from '../features';
import api from '../generated/api.json';
import type { ApiEntry } from '../generated/api-types';

const CONTROLS = new Set(['SliderField', 'SwitchField', 'ToggleField', 'SelectField', 'GroupedSelectField', 'ColorField', 'Field']);
const SCOPES = new Set(['PanelSection', 'FeatureScopeProvider']);
const STUDIO = path.resolve(__dirname, '../../components/studio');

const allPaths = (entries: ReadonlyArray<ApiEntry>): string[] => entries.flatMap((e) => [e.path, ...(e.children ? allPaths(e.children) : [])]);
const CONFIG_PATHS = new Set(allPaths(api.config as ReadonlyArray<ApiEntry>));
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
    const bad = uses.filter((u) => u.configPath && u.configPath !== '<expr>' && !CONFIG_PATHS.has(u.configPath));
    expect(bad.map((u) => `${u.file}:${u.line} configPath=${u.configPath}`)).toEqual([]);
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
