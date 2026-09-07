import { GLOBE_CONFIG_KEYS } from '@your-globe/core';
import { describe, expect, it } from 'vitest';
import api from '../generated/api.json';

const CORE_EVENTS = api.events.map((e) => e.name);
const topLevelKeys = api.config.map((e) => e.name).filter((n) => n !== 'container');

describe('framework wrappers forward the whole config', () => {
  it('GLOBE_CONFIG_KEYS lists every GlobeConfig key except container', () => {
    expect([...GLOBE_CONFIG_KEYS]).toEqual(topLevelKeys);
  });

  it('Vue exposes a prop per config key and an emit per event', () => {
    expect(api.wrappers.vue.props.map((p) => p.name)).toEqual(topLevelKeys);
    expect(api.wrappers.vue.events.map((e) => e.name).sort()).toEqual([...CORE_EVENTS].sort());
    expect(api.wrappers.vue.exposed).toContain('getInstance');
  });

  it('Angular exposes an input per config key and an output per event', () => {
    expect(api.wrappers.angular.inputs.map((p) => p.name)).toEqual(topLevelKeys);
    const outputs = api.wrappers.angular.outputs.map((e) => (e.name === 'globeError' ? 'error' : e.name));
    expect(outputs.sort()).toEqual([...CORE_EVENTS].sort());
    expect(api.wrappers.angular.methods.map((m) => m.name)).toContain('getInstance');
  });

  it('React forwards GlobeConfig and exposes a callback per event', () => {
    expect(api.wrappers.react.forwardsWholeConfig).toBe(true);
    const callbacks = api.wrappers.react.events.map((e) => e.name.replace(/^on/, '')).map((n) => n.charAt(0).toLowerCase() + n.slice(1));
    expect(callbacks.sort()).toEqual([...CORE_EVENTS].sort());
    expect(api.wrappers.react.handle.map((h) => h.name)).toContain('getInstance');
  });
});
