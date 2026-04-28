import { createGlobe } from '@your-globe/core';

const container = document.getElementById('app');
const status = document.getElementById('status');
if (!container) throw new Error('#app not found');

const globe = createGlobe({
  container,
  backgroundColor: '#000010',
  globeColor: '#0b1d3a',
  countries: {
    resolution: 'low',
    style: 'borders',
    borderColor: '#4a9eff',
    hoverEnabled: true,
  },
  atmosphere: {
    enabled: true,
    color: '#4a9eff',
    intensity: 1.2,
  },
  autoRotate: {
    enabled: true,
    speed: 0.4,
  },
  markers: [
    { id: 'waw', position: [52.2297, 21.0122], color: '#ffd700' },
    { id: 'nyc', position: [40.7128, -74.006], color: '#ff5577' },
    { id: 'tyo', position: [35.6762, 139.6503], color: '#22ddaa' },
    { id: 'syd', position: [-33.8688, 151.2093], color: '#ffaa33' },
  ],
});

globe.on('ready', () => {
  if (status) status.textContent = 'Gotowe — przeciągnij myszą.';
});
globe.on('error', (err) => {
  if (status) status.textContent = `Błąd: ${err.message}`;
});
globe.on('markerClick', ({ marker }) => {
  if (status) status.textContent = `Kliknięto marker: ${marker.id}`;
});

globe.mount();

window.addEventListener('beforeunload', () => globe.destroy());
