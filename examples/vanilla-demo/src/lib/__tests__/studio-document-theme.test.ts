import { describe, expect, it } from 'vitest';
import { DEFAULT_TOKENS, resolveTheme, THEME_PRESETS, type ThemePresetName } from '@your-globe/core';
import { createStudioThemeDraft } from '@/lib/studio-document-theme';

describe('custom theme drafts', () => {
  it('retains every base token, including those not exposed by the color editor', () => {
    for (const name of Object.keys(THEME_PRESETS) as ThemePresetName[]) {
      const draft = createStudioThemeDraft(name);
      expect(resolveTheme({ tokens: draft })).toEqual(resolveTheme(name));
      expect(Object.keys(draft)).toEqual(Object.keys(DEFAULT_TOKENS));
      expect(draft).not.toBe(DEFAULT_TOKENS);
    }
    expect(createStudioThemeDraft('paper-default')['paper.surfaceColor']).toBe(resolveTheme('paper-default')['paper.surfaceColor']);
  });

  it('preserves an older partial save exactly when editing, instead of silently adding its metadata base', () => {
    const tokens = { 'globe.surfaceColor': '#123456' };
    const draft = createStudioThemeDraft('paper-default', tokens);
    expect(draft).toEqual(resolveTheme({ tokens }));
    expect(resolveTheme({ extends: 'paper-default', tokens: draft })).toEqual(resolveTheme({ tokens }));
    expect(tokens).toEqual({ 'globe.surfaceColor': '#123456' });
  });
});
