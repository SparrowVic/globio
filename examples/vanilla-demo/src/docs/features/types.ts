import type { ComponentType } from 'react';
import type { GlobeKind } from '@your-globe/core';
import type { FrameworkCode } from '../frameworks';

/**
 * One entry per capability of the engine. The documentation pages and the
 * Studio help tips both read this registry, so a feature is described in
 * exactly one place. Facts that already live in the types (type, default,
 * one-line meaning of a key) come from `generated/api.json`; this registry
 * holds what the types cannot: the summary, the kinds, the page, the
 * canonical example and the optional rich tip.
 */
export interface FeatureDoc {
  /** Stable id, kebab-case; Studio controls and cross-links use it. */
  readonly id: string;
  readonly title: string;
  /**
   * Config key(s) this feature owns, as dot paths into GlobeConfig
   * (`autoRotate`, `countries.fill`). Instance-only features list none.
   */
  readonly configPaths?: ReadonlyArray<string>;
  /** Instance methods and events that belong to the feature. */
  readonly methods?: ReadonlyArray<string>;
  readonly events?: ReadonlyArray<string>;
  /** At most 180 characters, plain text: tooltips, search results, cards. */
  readonly summary: string;
  readonly kinds: ReadonlyArray<GlobeKind> | 'all';
  /** Where the long form lives: a docs page slug and an optional section anchor. */
  readonly docs: { readonly slug: string; readonly anchor?: string };
  /** Canonical example, one snippet per framework. */
  readonly example?: FrameworkCode;
  /** Rich tooltip body for the Studio, loaded on first hover. */
  readonly tip?: () => Promise<{ readonly default: ComponentType }>;
  readonly related?: ReadonlyArray<string>;
  /** Which Studio control the feature decorates; filled in when the tips are wired. */
  readonly studio?: { readonly panel: string; readonly control: string };
}
