import {
  createGlobe,
  type GlobeInstance,
  type ThemePresetName,
} from '@your-globe/core';

const container = document.getElementById('app');
const status = document.getElementById('status');
if (!container) throw new Error('#app not found');

const $autoRotate = document.getElementById('toggle-autorotate') as HTMLInputElement;
const $speed = document.getElementById('speed-autorotate') as HTMLInputElement;
const $speedValue = document.getElementById('speed-value') as HTMLSpanElement;
const $hoverEnabled = document.getElementById('toggle-hover-status') as HTMLInputElement;

const settings = {
  themeName: 'outline-dark' as ThemePresetName,
  autoRotateEnabled: true,
  autoRotateSpeed: 0.4,
  hoverHudEnabled: true,
};

let globe: GlobeInstance | undefined;

const setStatus = (text: string): void => {
  if (status) status.textContent = text;
};

const buildGlobe = (themeName: ThemePresetName): void => {
  globe?.destroy();
  settings.themeName = themeName;
  globe = createGlobe({
    container,
    theme: themeName,
    countries: { resolution: 'low', style: 'borders', hoverEnabled: true },
    atmosphere: { enabled: true },
    autoRotate: { enabled: settings.autoRotateEnabled, speed: settings.autoRotateSpeed },
    markers: [
      { id: 'waw', position: [52.2297, 21.0122] },
      { id: 'nyc', position: [40.7128, -74.006] },
      { id: 'tyo', position: [35.6762, 139.6503] },
      { id: 'syd', position: [-33.8688, 151.2093] },
    ],
  });

  globe.on('ready', () => setStatus(`Theme: ${themeName}`));
  globe.on('error', (err) => setStatus(`Błąd: ${err.message}`));
  globe.on('markerClick', ({ marker }) => setStatus(`Kliknięto marker: ${marker.id}`));
  globe.on('countryHover', (event) => {
    if (!settings.hoverHudEnabled) return;
    setStatus(event ? `Hover: ${event.country.name}` : `Theme: ${settings.themeName}`);
  });
  globe.on('countryClick', ({ country }) => {
    setStatus(`Klik: ${country.name} (${country.id})`);
  });

  globe.mount();
};

document.querySelectorAll<HTMLButtonElement>('button[data-theme]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const name = btn.dataset['theme'] as ThemePresetName;
    buildGlobe(name);
  });
});

$autoRotate.addEventListener('change', () => {
  settings.autoRotateEnabled = $autoRotate.checked;
  globe?.update({
    autoRotate: { enabled: settings.autoRotateEnabled, speed: settings.autoRotateSpeed },
  });
});

const updateSpeedDisplay = (): void => {
  $speedValue.textContent = settings.autoRotateSpeed.toFixed(2);
};

$speed.addEventListener('input', () => {
  settings.autoRotateSpeed = Number.parseFloat($speed.value);
  updateSpeedDisplay();
  globe?.update({
    autoRotate: { enabled: settings.autoRotateEnabled, speed: settings.autoRotateSpeed },
  });
});

$hoverEnabled.addEventListener('change', () => {
  settings.hoverHudEnabled = $hoverEnabled.checked;
  if (!settings.hoverHudEnabled) setStatus(`Theme: ${settings.themeName}`);
});

updateSpeedDisplay();
buildGlobe(settings.themeName);

window.addEventListener('beforeunload', () => globe?.destroy());
