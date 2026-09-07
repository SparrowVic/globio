import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { KIND_DATA_LAYER_SUPPORT } from '../kind-support';
import { FEATURES, featureForConfigPath, featureForEvent, featureForMethod } from '../features';
import api from '../generated/api.json';
import type { ApiEntry } from '../generated/api-types';
import { DOCS_TABS, findPage } from '../manifest';

const allPaths = (entries: ReadonlyArray<ApiEntry>): string[] => entries.flatMap((e) => [e.path, ...(e.children ? allPaths(e.children) : [])]);
const CONFIG_PATHS = new Set(allPaths(api.config as ReadonlyArray<ApiEntry>));
const METHODS = new Set(api.instance.map((m) => m.name));
const EVENTS = new Set(api.events.map((e) => e.name));

describe('feature registry', () => {
  it('has unique ids and short summaries', () => {
    const ids = FEATURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of FEATURES) {
      expect(f.summary.length, `${f.id} summary`).toBeLessThanOrEqual(180);
      expect(f.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('points at existing docs pages and API members', () => {
    for (const f of FEATURES) {
      expect(findPage(f.docs.slug), `${f.id} → ${f.docs.slug}`).not.toBeNull();
      for (const p of f.configPaths ?? []) expect(CONFIG_PATHS.has(p), `${f.id} config path ${p}`).toBe(true);
      for (const m of f.methods ?? []) expect(METHODS.has(m), `${f.id} method ${m}`).toBe(true);
      for (const e of f.events ?? []) expect(EVENTS.has(e), `${f.id} event ${e}`).toBe(true);
      for (const r of f.related ?? []) expect(FEATURES.some((g) => g.id === r), `${f.id} related ${r}`).toBe(true);
    }
  });

  it('claims every top-level config key, instance method and event exactly once', () => {
    const unclaimedKeys = api.config.map((e) => e.name).filter((n) => n !== 'container' && !featureForConfigPath(n));
    expect(unclaimedKeys).toEqual([]);
    const unclaimedMethods = [...METHODS].filter((m) => !featureForMethod(m));
    expect(unclaimedMethods).toEqual([]);
    const unclaimedEvents = [...EVENTS].filter((e) => !featureForEvent(e));
    expect(unclaimedEvents).toEqual([]);

    const methodOwners = new Map<string, string[]>();
    const eventOwners = new Map<string, string[]>();
    const configOwners = new Map<string, string[]>();
    for (const f of FEATURES) {
      for (const p of f.configPaths ?? []) configOwners.set(p, [...(configOwners.get(p) ?? []), f.id]);
      for (const m of f.methods ?? []) methodOwners.set(m, [...(methodOwners.get(m) ?? []), f.id]);
      for (const e of f.events ?? []) eventOwners.set(e, [...(eventOwners.get(e) ?? []), f.id]);
    }
    expect([...methodOwners.entries()].filter(([, owners]) => owners.length > 1)).toEqual([]);
    expect([...eventOwners.entries()].filter(([, owners]) => owners.length > 1)).toEqual([]);
    expect([...configOwners.entries()].filter(([, owners]) => owners.length > 1)).toEqual([]);
    for (const path of CONFIG_PATHS) {
      if (path !== 'container') expect(featureForConfigPath(path), path).toBeDefined();
    }
  });

  it('resolves specialized feature owners before their kind or parent section', () => {
    expect(featureForConfigPath('outline.hoverCrosshair.width')?.id).toBe('hover-crosshair');
    expect(featureForConfigPath('cinematic.sun.mode')?.id).toBe('cinematic-sun');
    expect(featureForConfigPath('performance.pauseWhenHidden')?.id).toBe('pausing');
  });

  it('keeps data-layer support aligned with registered kind decorators', () => {
    const kinds = ['outline', 'dotted', 'wireframe', 'hologram', 'paper', 'cinematic'] as const;
    for (const kind of kinds) {
      const source = readFileSync(new URL(`../../../../../packages/core/src/kinds/${kind}/index.ts`, import.meta.url), 'utf8');
      const file = ts.createSourceFile(`${kind}.ts`, source, ts.ScriptTarget.Latest, true);
      const registered = new Set<string>();
      const visit = (node: ts.Node) => {
        if (ts.isPropertyAssignment(node) && node.name.getText(file) === 'dataLayers' && ts.isObjectLiteralExpression(node.initializer)) {
          for (const property of node.initializer.properties) {
            if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) registered.add(property.name.getText(file));
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(file);
      for (const row of KIND_DATA_LAYER_SUPPORT) expect(row.support[kind] === true, `${kind}.${row.label}`).toBe(registered.has(row.label));
      for (const id of ['heatmap', 'hexbin', 'charts']) {
        const feature = FEATURES.find((entry) => entry.id === id)!;
        expect(feature.kinds === 'all' || feature.kinds.includes(kind), `${kind} feature ${id}`).toBe(registered.has(id));
      }
    }
  });
});

describe('manifest', () => {
  it('has unique slugs and working previous/next links', () => {
    const slugs = DOCS_TABS.flatMap((t) => t.groups.flatMap((g) => g.pages.map((p) => p.slug)));
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      const loc = findPage(slug);
      expect(loc?.page.slug).toBe(slug);
      if (loc?.prev) expect(findPage(loc.prev.slug)?.next?.slug).toBe(slug);
    }
  });
});
