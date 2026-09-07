import type { ArcConfig, CinematicConfig } from '@your-globe/core';

/**
 * The stage's cinematic look: fully procedural (no texture download), sun
 * pinned so the terminator stays where the composition wants it, clouds and
 * aurora on, city lights parked (owner's call, 2026-09-07).
 */
export const STAGE_CINEMATIC: CinematicConfig = {
  quality: 'auto',
  reactivity: {
    lightInfluence: 1,
    cameraInfluence: 1,
    densityInfluence: 1,
    terminatorBoost: 1.28,
    horizonGlow: 1.34,
    atmosphericScatter: 1.38,
    surfaceMicroDetail: 1.22,
    cityNightResponse: 0,
    orbitalFlow: 1.08,
  },
  surface: {
    lightingMode: 'hero',
    lightDirection: [-0.68, 0.72, 0.22],
    terminatorSoftness: 0.34,
    terminatorContrast: 1.58,
    keyIntensity: 1.54,
    fillIntensity: 0.1,
    rimIntensity: 1.12,
    rimPower: 2.18,
    specularIntensity: 0.92,
    oceanSheen: 0.58,
    relief: 1.1,
    shallows: 0.65,
  },
  sun: { mode: 'fixed', visible: true, glare: 0.9 },
  clouds: { enabled: true, coverage: 0.46, opacity: 0.8, shadows: true },
  aurora: { enabled: true, intensity: 0.7 },
  textures: null,
  cityLights: { enabled: false, intensity: 1.62, count: 11800, size: 0.0056, twinkle: true },
  network: { enabled: true, opacity: 0.19, maxConnections: 58, pulseSpeed: 0.26 },
  borders: { enabled: true, intensity: 1.08 },
};

/** Three North-Atlantic routes — the part of the planet the hero crop shows. */
export const STAGE_ARCS: ReadonlyArray<ArcConfig> = [
  {
    id: 'stage-new-york-lisbon',
    from: [40.7128, -74.006],
    to: [38.7223, -9.1393],
    color: '#ff8a4c',
    width: 1.6,
    height: 'auto',
    minHeight: 0.08,
    maxHeight: 0.22,
    animated: true,
    animationDuration: 2.8,
    headEasing: 'pulse',
  },
  {
    id: 'stage-mexico-madrid',
    from: [19.4326, -99.1332],
    to: [40.4168, -3.7038],
    color: '#6fb4ff',
    width: 1.25,
    height: 'auto',
    minHeight: 0.07,
    maxHeight: 0.24,
    style: 'dashed',
    dashSize: 0.035,
    dashGap: 0.022,
    animated: true,
    animationDuration: 3.4,
    headEasing: 'easeInOut',
  },
  {
    id: 'stage-montreal-reykjavik',
    from: [45.5017, -73.5673],
    to: [64.1466, -21.9426],
    color: '#dcebff',
    width: 1.05,
    height: 0.14,
    animated: true,
    animationDuration: 3.9,
    headEasing: 'linear',
  },
];
