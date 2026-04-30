import type { ChartsDataEntry, ChartSeries } from '@your-globe/core';

/**
 * Whole-globe charts datasets — countries keyed by ISO 3166-1 numeric
 * code (matches the world-atlas TopoJSON the globe loads internally).
 * Designed for `chartType: 'extruded'` where the globe gets coloured +
 * extruded across every country at once, but multi-series datasets
 * also work for grouped / stacked / pie / etc.
 */

export const GDP_SERIES: ReadonlyArray<ChartSeries> = [
  { key: 'gdp', label: 'GDP (USD trillions)', color: '#65d18a' },
];

/**
 * GDP nominal per country, ~2023 estimates from World Bank / IMF rounded
 * to two decimal places. ~70 economies covering every populated continent.
 * USA + China dominate at 27/17 trillion; the long tail goes down to
 * ~0.02 trillion (Iceland) so the extruded view shows a clear power-law
 * shape — economic giants tower over the rest.
 */
export const WORLD_GDP_NOMINAL: ReadonlyArray<ChartsDataEntry> = [
  // Top 10
  { id: '840', label: 'USA',          values: { gdp: 27.36 } },
  { id: '156', label: 'China',        values: { gdp: 17.79 } },
  { id: '276', label: 'Germany',      values: { gdp: 4.46 } },
  { id: '392', label: 'Japan',        values: { gdp: 4.21 } },
  { id: '356', label: 'India',        values: { gdp: 3.55 } },
  { id: '826', label: 'UK',           values: { gdp: 3.34 } },
  { id: '250', label: 'France',       values: { gdp: 3.03 } },
  { id: '076', label: 'Brazil',       values: { gdp: 2.13 } },
  { id: '380', label: 'Italy',        values: { gdp: 2.19 } },
  { id: '124', label: 'Canada',       values: { gdp: 2.14 } },
  // 11-20
  { id: '643', label: 'Russia',       values: { gdp: 2.02 } },
  { id: '484', label: 'Mexico',       values: { gdp: 1.79 } },
  { id: '036', label: 'Australia',    values: { gdp: 1.72 } },
  { id: '410', label: 'South Korea',  values: { gdp: 1.71 } },
  { id: '724', label: 'Spain',        values: { gdp: 1.58 } },
  { id: '360', label: 'Indonesia',    values: { gdp: 1.37 } },
  { id: '792', label: 'Turkey',       values: { gdp: 1.11 } },
  { id: '528', label: 'Netherlands',  values: { gdp: 1.12 } },
  { id: '682', label: 'Saudi Arabia', values: { gdp: 1.07 } },
  { id: '756', label: 'Switzerland',  values: { gdp: 0.91 } },
  // 21-30
  { id: '616', label: 'Poland',       values: { gdp: 0.81 } },
  { id: '032', label: 'Argentina',    values: { gdp: 0.64 } },
  { id: '056', label: 'Belgium',      values: { gdp: 0.63 } },
  { id: '752', label: 'Sweden',       values: { gdp: 0.59 } },
  { id: '372', label: 'Ireland',      values: { gdp: 0.55 } },
  { id: '566', label: 'Nigeria',      values: { gdp: 0.39 } },
  { id: '376', label: 'Israel',       values: { gdp: 0.51 } },
  { id: '578', label: 'Norway',       values: { gdp: 0.49 } },
  { id: '040', label: 'Austria',      values: { gdp: 0.52 } },
  { id: '784', label: 'UAE',          values: { gdp: 0.51 } },
  // 31-40
  { id: '702', label: 'Singapore',    values: { gdp: 0.50 } },
  { id: '050', label: 'Bangladesh',   values: { gdp: 0.45 } },
  { id: '818', label: 'Egypt',        values: { gdp: 0.40 } },
  { id: '608', label: 'Philippines',  values: { gdp: 0.44 } },
  { id: '710', label: 'South Africa', values: { gdp: 0.38 } },
  { id: '344', label: 'Hong Kong',    values: { gdp: 0.39 } },
  { id: '208', label: 'Denmark',      values: { gdp: 0.40 } },
  { id: '364', label: 'Iran',         values: { gdp: 0.41 } },
  { id: '458', label: 'Malaysia',     values: { gdp: 0.40 } },
  { id: '704', label: 'Vietnam',      values: { gdp: 0.43 } },
  // 41-50
  { id: '170', label: 'Colombia',     values: { gdp: 0.36 } },
  { id: '604', label: 'Peru',         values: { gdp: 0.27 } },
  { id: '586', label: 'Pakistan',     values: { gdp: 0.34 } },
  { id: '152', label: 'Chile',        values: { gdp: 0.34 } },
  { id: '642', label: 'Romania',      values: { gdp: 0.35 } },
  { id: '246', label: 'Finland',      values: { gdp: 0.30 } },
  { id: '203', label: 'Czech Rep.',   values: { gdp: 0.33 } },
  { id: '620', label: 'Portugal',     values: { gdp: 0.29 } },
  { id: '554', label: 'New Zealand',  values: { gdp: 0.25 } },
  { id: '300', label: 'Greece',       values: { gdp: 0.24 } },
  // 51-70
  { id: '348', label: 'Hungary',      values: { gdp: 0.21 } },
  { id: '634', label: 'Qatar',        values: { gdp: 0.24 } },
  { id: '368', label: 'Iraq',         values: { gdp: 0.26 } },
  { id: '414', label: 'Kuwait',       values: { gdp: 0.16 } },
  { id: '398', label: 'Kazakhstan',   values: { gdp: 0.26 } },
  { id: '012', label: 'Algeria',      values: { gdp: 0.23 } },
  { id: '404', label: 'Kenya',        values: { gdp: 0.12 } },
  { id: '231', label: 'Ethiopia',     values: { gdp: 0.16 } },
  { id: '804', label: 'Ukraine',      values: { gdp: 0.18 } },
  { id: '504', label: 'Morocco',      values: { gdp: 0.14 } },
  { id: '703', label: 'Slovakia',     values: { gdp: 0.13 } },
  { id: '862', label: 'Venezuela',    values: { gdp: 0.10 } },
  { id: '191', label: 'Croatia',      values: { gdp: 0.08 } },
  { id: '440', label: 'Lithuania',    values: { gdp: 0.08 } },
  { id: '144', label: 'Sri Lanka',    values: { gdp: 0.08 } },
  { id: '112', label: 'Belarus',      values: { gdp: 0.07 } },
  { id: '705', label: 'Slovenia',     values: { gdp: 0.07 } },
  { id: '233', label: 'Estonia',      values: { gdp: 0.04 } },
  { id: '428', label: 'Latvia',       values: { gdp: 0.04 } },
  { id: '352', label: 'Iceland',      values: { gdp: 0.03 } },
];

/**
 * CO2 emissions per country, megatonnes CO2/year, ~2022 data. Same
 * country set as GDP — different ranking (China #1 by a huge margin,
 * then USA ~half, then India, EU spread). Tells a different story
 * than GDP about the same anchor points. Single series so it works
 * cleanly with `chartType: 'extruded'`.
 */
export const CO2_SERIES: ReadonlyArray<ChartSeries> = [
  { key: 'co2', label: 'CO₂ (Mt/year)', color: '#f25c5c' },
];

export const WORLD_CO2_EMISSIONS: ReadonlyArray<ChartsDataEntry> = [
  { id: '156', label: 'China',        values: { co2: 11400 } },
  { id: '840', label: 'USA',          values: { co2: 5000 } },
  { id: '356', label: 'India',        values: { co2: 2700 } },
  { id: '643', label: 'Russia',       values: { co2: 1700 } },
  { id: '392', label: 'Japan',        values: { co2: 1100 } },
  { id: '364', label: 'Iran',         values: { co2: 750 } },
  { id: '276', label: 'Germany',      values: { co2: 670 } },
  { id: '410', label: 'South Korea',  values: { co2: 620 } },
  { id: '360', label: 'Indonesia',    values: { co2: 690 } },
  { id: '682', label: 'Saudi Arabia', values: { co2: 650 } },
  { id: '124', label: 'Canada',       values: { co2: 580 } },
  { id: '076', label: 'Brazil',       values: { co2: 480 } },
  { id: '484', label: 'Mexico',       values: { co2: 460 } },
  { id: '036', label: 'Australia',    values: { co2: 400 } },
  { id: '710', label: 'South Africa', values: { co2: 440 } },
  { id: '792', label: 'Turkey',       values: { co2: 420 } },
  { id: '826', label: 'UK',           values: { co2: 340 } },
  { id: '380', label: 'Italy',        values: { co2: 310 } },
  { id: '250', label: 'France',       values: { co2: 290 } },
  { id: '616', label: 'Poland',       values: { co2: 320 } },
  { id: '704', label: 'Vietnam',      values: { co2: 320 } },
  { id: '724', label: 'Spain',        values: { co2: 240 } },
  { id: '784', label: 'UAE',          values: { co2: 220 } },
  { id: '586', label: 'Pakistan',     values: { co2: 240 } },
  { id: '368', label: 'Iraq',         values: { co2: 240 } },
  { id: '458', label: 'Malaysia',     values: { co2: 270 } },
  { id: '152', label: 'Chile',        values: { co2: 90 } },
  { id: '414', label: 'Kuwait',       values: { co2: 100 } },
  { id: '398', label: 'Kazakhstan',   values: { co2: 280 } },
  { id: '208', label: 'Denmark',      values: { co2: 30 } },
  { id: '578', label: 'Norway',       values: { co2: 40 } },
  { id: '752', label: 'Sweden',       values: { co2: 40 } },
  { id: '246', label: 'Finland',      values: { co2: 40 } },
  { id: '566', label: 'Nigeria',      values: { co2: 130 } },
  { id: '818', label: 'Egypt',        values: { co2: 270 } },
  { id: '012', label: 'Algeria',      values: { co2: 180 } },
  { id: '604', label: 'Peru',         values: { co2: 60 } },
  { id: '170', label: 'Colombia',     values: { co2: 90 } },
  { id: '032', label: 'Argentina',    values: { co2: 190 } },
  { id: '050', label: 'Bangladesh',   values: { co2: 110 } },
  { id: '608', label: 'Philippines',  values: { co2: 150 } },
  { id: '804', label: 'Ukraine',      values: { co2: 170 } },
  { id: '348', label: 'Hungary',      values: { co2: 50 } },
  { id: '203', label: 'Czech Rep.',   values: { co2: 100 } },
  { id: '300', label: 'Greece',       values: { co2: 60 } },
  { id: '620', label: 'Portugal',     values: { co2: 40 } },
  { id: '554', label: 'New Zealand',  values: { co2: 35 } },
  { id: '372', label: 'Ireland',      values: { co2: 36 } },
  { id: '040', label: 'Austria',      values: { co2: 65 } },
  { id: '056', label: 'Belgium',      values: { co2: 95 } },
  { id: '528', label: 'Netherlands',  values: { co2: 145 } },
  { id: '756', label: 'Switzerland',  values: { co2: 35 } },
  { id: '376', label: 'Israel',       values: { co2: 60 } },
  { id: '702', label: 'Singapore',    values: { co2: 55 } },
  { id: '344', label: 'Hong Kong',    values: { co2: 35 } },
  { id: '404', label: 'Kenya',        values: { co2: 20 } },
  { id: '231', label: 'Ethiopia',     values: { co2: 20 } },
  { id: '504', label: 'Morocco',      values: { co2: 75 } },
  { id: '634', label: 'Qatar',        values: { co2: 110 } },
  { id: '703', label: 'Slovakia',     values: { co2: 30 } },
  { id: '862', label: 'Venezuela',    values: { co2: 110 } },
  { id: '191', label: 'Croatia',      values: { co2: 17 } },
  { id: '440', label: 'Lithuania',    values: { co2: 12 } },
  { id: '144', label: 'Sri Lanka',    values: { co2: 25 } },
  { id: '112', label: 'Belarus',      values: { co2: 60 } },
  { id: '705', label: 'Slovenia',     values: { co2: 13 } },
  { id: '233', label: 'Estonia',      values: { co2: 8 } },
  { id: '428', label: 'Latvia',       values: { co2: 7 } },
  { id: '352', label: 'Iceland',      values: { co2: 4 } },
  { id: '642', label: 'Romania',      values: { co2: 75 } },
  { id: '422', label: 'Lebanon',      values: { co2: 26 } },
];
