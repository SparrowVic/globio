import type { CountryFeature } from '../../renderer/country-feature';
import type { HeatmapDataLayer } from '../types';

/**
 * Manual aliases mapping the normalised demo / API country name to the
 * world-atlas / Natural Earth feature name. Most countries match by
 * canonical lower-case alphanumeric; this table only handles the cases
 * where the source feature uses a less obvious form.
 */
const COUNTRY_NAME_ALIASES: Readonly<Record<string, string>> = {
  bosniaandherzegovina: 'bosniaandherz',
  centralafricanrepublic: 'centralafricanrep',
  czechrepublic: 'czechia',
  democraticrepublicofthecongo: 'demrepcongo',
  dominicanrepublic: 'dominicanrep',
  drcongo: 'demrepcongo',
  equatorialguinea: 'eqguinea',
  northmacedonia: 'macedonia',
  republicofthecongo: 'congo',
  solomonislands: 'solomonis',
  southsudan: 'ssudan',
  unitedstates: 'unitedstatesofamerica',
  unitedstatesofamerica: 'unitedstatesofamerica',
};

/** Canonicalise a country name / id to a lookup key (NFD-stripped, alpha-only). */
export const countryKey = (value: string): string => {
  const normal = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return COUNTRY_NAME_ALIASES[normal] ?? normal;
};

/**
 * Build a many-to-one index: each feature is reachable by its raw id +
 * canonical id + raw name + canonical name + (for purely numeric ids)
 * the parsed integer string. Lets dome lookups match against whatever
 * key shape the caller passed on the data entry.
 */
export const buildCountryFeatureIndex = (
  features: ReadonlyArray<CountryFeature>
): ReadonlyMap<string, CountryFeature> => {
  const out = new Map<string, CountryFeature>();
  const add = (key: string | undefined, feature: CountryFeature): void => {
    if (!key) return;
    const raw = key.trim();
    if (!raw) return;
    out.set(raw, feature);
    out.set(countryKey(raw), feature);
    if (/^\d+$/.test(raw)) out.set(String(Number(raw)), feature);
  };
  for (const feature of features) {
    add(feature.id, feature);
    add(feature.name, feature);
  }
  return out;
};

/** Look up the country feature for a heatmap data entry by id then name. */
export const findCountryFeature = (
  entry: HeatmapDataLayer['data'][number],
  featuresByKey: ReadonlyMap<string, CountryFeature>
): CountryFeature | null => {
  if (entry.id) {
    const byId = featuresByKey.get(entry.id) ?? featuresByKey.get(countryKey(entry.id));
    if (byId) return byId;
  }
  if (entry.name) {
    const byName = featuresByKey.get(entry.name) ?? featuresByKey.get(countryKey(entry.name));
    if (byName) return byName;
  }
  return null;
};
