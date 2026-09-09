import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetAllPanelState } from '../usePanelState';

function storageAt(pathname: string, entries: Record<string, string>) {
  const values = new Map(Object.entries(entries));
  const storage = {
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => { values.delete(key); },
  };
  vi.stubGlobal('window', { location: { pathname }, localStorage: storage });
  return values;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('resetAllPanelState', () => {
  it('resets all Studio panels without deleting saved work or other routes', () => {
    const savedThemes = JSON.stringify([{ id: 'custom-aurora', tokens: { background: { color: '#102030' } } }]);
    const savedPresets = JSON.stringify([{ id: 'preset-atlas', name: 'My atlas', state: { kind: 'paper' } }]);
    const preserved = {
      'globio-custom-themes': savedThemes,
      'globio-custom-presets': savedPresets,
      'globio-index-navigation': 'true',
      'globio-charts-camera': 'false',
      'globio-studios-panel': 'true',
      'globio.docs.framework': 'vue',
      'unrelated-app-preference': 'keep',
    };
    const values = storageAt('/studio', {
      'globio-studio-stage': 'true',
      'globio-studio-inspector': 'false',
      'globio-studio-camera': 'true',
      ...preserved,
    });

    resetAllPanelState();

    expect(Object.fromEntries(values)).toEqual(preserved);
  });

  it.each([
    ['/heatmap.html', 'heatmap'],
    ['/studio/', 'studio'],
    ['/', 'index'],
  ])('resets the same panel namespace used by %s', (route, namespace) => {
    const values = storageAt(route, {
      [`globio-${namespace}-stage`]: 'false',
      [`globio-${namespace}-inspector`]: 'true',
      'globio-docs-preferences': 'false',
      'globio-custom-presets': '[{"name":"Keep me"}]',
    });

    resetAllPanelState();

    expect([...values.keys()]).toEqual(['globio-docs-preferences', 'globio-custom-presets']);
  });

  it('does not prevent resetting the scene when browser storage is unavailable', () => {
    vi.stubGlobal('window', {
      location: { pathname: '/studio' },
      get localStorage() { throw new Error('Storage access denied'); },
    });
    expect(() => resetAllPanelState()).not.toThrow();

    vi.stubGlobal('window', undefined);
    expect(() => resetAllPanelState()).not.toThrow();
  });
});
