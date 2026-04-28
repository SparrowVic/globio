import {
  createGlobe,
  type GlobeInstance,
  type ThemePresetName,
} from '@your-globe/core';

const container = document.getElementById('app');
const status = document.getElementById('status');
if (!container) throw new Error('#app not found');

let globe: GlobeInstance | undefined;

const buildGlobe = (themeName: ThemePresetName): void => {
  globe?.destroy();
  globe = createGlobe({
    container,
    theme: themeName,
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
  globe.on('countryHover', (event) => {
    if (!status) return;
    if (event) {
      status.textContent = `Hover: ${event.country.name}`;
    } else {
      status.textContent = `Theme: ${themeName}`;
    }
  });
  globe.on('countryClick', ({ country }) => {
    if (status) status.textContent = `Klik: ${country.name} (${country.id})`;
  });

  globe.mount();
};

buildGlobe('outline-dark');

document.querySelectorAll<HTMLButtonElement>('button[data-theme]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const name = btn.dataset['theme'] as ThemePresetName;
    buildGlobe(name);
  });
});

window.addEventListener('beforeunload', () => globe?.destroy());
