import {
  AFRICA,
  ASIA,
  EUROPE,
  NORTH_AMERICA,
  OCEANIA,
  SOUTH_AMERICA,
} from '../../data/regions';

export type Continent =
  | 'EUROPE'
  | 'ASIA'
  | 'AFRICA'
  | 'NORTH_AMERICA'
  | 'SOUTH_AMERICA'
  | 'OCEANIA';

const TABLE: ReadonlyArray<readonly [Continent, ReadonlyArray<string>]> = [
  ['EUROPE', EUROPE],
  ['ASIA', ASIA],
  ['AFRICA', AFRICA],
  ['NORTH_AMERICA', NORTH_AMERICA],
  ['SOUTH_AMERICA', SOUTH_AMERICA],
  ['OCEANIA', OCEANIA],
];

const INDEX: Map<string, Continent> = (() => {
  const m = new Map<string, Continent>();
  for (const [name, ids] of TABLE) for (const id of ids) if (!m.has(id)) m.set(id, name);
  return m;
})();

export const continentOf = (countryId: string): Continent | null => {
  return INDEX.get(countryId) ?? null;
};
