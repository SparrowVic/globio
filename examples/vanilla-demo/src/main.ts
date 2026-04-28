import { createGlobe, type GlobeInstance, type ThemeConfig } from '@your-globe/core';

const container = document.getElementById('app');
const status = document.getElementById('status');
if (!container) throw new Error('#app not found');

const themes: Record<string, ThemeConfig> = {
  default: {},
  sunset: {
    tokens: {
      'background.color': '#180a1a',
      'globe.surface': '#3a1f3f',
      'borders.color': '#ffb070',
      'atmosphere.color': '#ff7e5f',
      'atmosphere.intensity': 1.6,
      'markers.defaultColor': '#ffd166',
    },
  },
  cyber: {
    tokens: {
      'background.color': '#000814',
      'globe.surface': '#0a0a14',
      'borders.color': '#00f0ff',
      'borders.opacity': 1,
      'atmosphere.color': '#ff2bd6',
      'atmosphere.intensity': 1.4,
      'markers.defaultColor': '#22ee99',
    },
  },
};

let globe: GlobeInstance | undefined;

const buildGlobe = (themeName: keyof typeof themes): void => {
  globe?.destroy();
  const theme = themes[themeName] ?? themes['default']!;
  globe = createGlobe({
    container,
    theme,
    countries: {
      resolution: 'low',
      style: 'borders',
      hoverEnabled: true,
    },
    atmosphere: { enabled: true },
    autoRotate: { enabled: true, speed: 0.4 },
    markers: [
      { id: 'waw', position: [52.2297, 21.0122] },
      { id: 'nyc', position: [40.7128, -74.006] },
      { id: 'tyo', position: [35.6762, 139.6503] },
      { id: 'syd', position: [-33.8688, 151.2093] },
    ],
  });

  globe.on('ready', () => {
    if (status) status.textContent = `Theme: ${themeName}`;
  });
  globe.on('error', (err) => {
    if (status) status.textContent = `Błąd: ${err.message}`;
  });
  globe.on('markerClick', ({ marker }) => {
    if (status) status.textContent = `Kliknięto marker: ${marker.id}`;
  });

  globe.mount();
};

buildGlobe('default');

document.querySelectorAll<HTMLButtonElement>('button[data-theme]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const name = btn.dataset['theme'] as keyof typeof themes;
    buildGlobe(name);
  });
});

window.addEventListener('beforeunload', () => globe?.destroy());
