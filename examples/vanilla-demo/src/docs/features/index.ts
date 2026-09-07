import { APPEARANCE_FEATURES } from './appearance';
import { CAMERA_FEATURES } from './camera';
import { DATA_FEATURES } from './data';
import { INTERACTION_FEATURES } from './interaction';
import { KIND_FEATURES } from './kinds';
import { RUNTIME_FEATURES } from './runtime';
import type { FeatureDoc } from './types';

export type { FeatureDoc } from './types';

/** Every documented capability, in reading order. */
export const FEATURES: ReadonlyArray<FeatureDoc> = [
  ...KIND_FEATURES,
  ...APPEARANCE_FEATURES,
  ...CAMERA_FEATURES,
  ...DATA_FEATURES,
  ...INTERACTION_FEATURES,
  ...RUNTIME_FEATURES,
];

const BY_ID: ReadonlyMap<string, FeatureDoc> = new Map(FEATURES.map((f) => [f.id, f]));

export const getFeature = (id: string): FeatureDoc | undefined => BY_ID.get(id);

export const featuresForPage = (slug: string): ReadonlyArray<FeatureDoc> => FEATURES.filter((f) => f.docs.slug === slug);

/** The feature that owns a config path, matching the longest declared prefix. */
export const featureForConfigPath = (path: string): FeatureDoc | undefined => {
  let best: FeatureDoc | undefined;
  let bestLength = -1;
  for (const f of FEATURES) {
    for (const p of f.configPaths ?? []) {
      if ((path === p || path.startsWith(`${p}.`)) && p.length > bestLength) {
        best = f;
        bestLength = p.length;
      }
    }
  }
  return best;
};

export const featureForMethod = (name: string): FeatureDoc | undefined => FEATURES.find((f) => f.methods?.includes(name));

export const featureForEvent = (name: string): FeatureDoc | undefined => FEATURES.find((f) => f.events?.includes(name));
