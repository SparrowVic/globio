import {
  createGlobe,
  resolveTheme,
  THEME_PRESETS,
  type GlobeInstance,
  type PartialTokenSet,
  type ThemePresetName,
  type TokenKey,
  type ZoomMode,
} from '@your-globe/core';

const container = document.getElementById('app');
const status = document.getElementById('status');
if (!container) throw new Error('#app not found');

const $autoRotate = document.getElementById('toggle-autorotate') as HTMLInputElement;
const $speed = document.getElementById('speed-autorotate') as HTMLInputElement;
const $speedValue = document.getElementById('speed-value') as HTMLSpanElement;
const $hoverEnabled = document.getElementById('toggle-hover-status') as HTMLInputElement;
const $zoomModeRadios = document.querySelectorAll<HTMLInputElement>('input[name="zoom-mode"]');
const $zoomStrength = document.getElementById('zoom-strength') as HTMLInputElement;
const $zoomStrengthValue = document.getElementById('zoom-strength-value') as HTMLSpanElement;
const $zoomStrengthRow = document.getElementById('zoom-strength-row') as HTMLDivElement;
const $smoothZoom = document.getElementById('toggle-smooth-zoom') as HTMLInputElement;
const $clickToFocus = document.getElementById('toggle-click-to-focus') as HTMLInputElement;
const $clickToPin = document.getElementById('toggle-click-to-pin') as HTMLInputElement;
const $flyHome = document.getElementById('btn-fly-home') as HTMLButtonElement;
const $clearActive = document.getElementById('btn-clear-active') as HTMLButtonElement;
const $hoverOcclude = document.getElementById('toggle-hover-occlude') as HTMLInputElement;
const $studioBody = document.getElementById('studio-body') as HTMLDivElement;
const $studioResetAll = document.getElementById('studio-reset-all') as HTMLButtonElement;
const $studioExport = document.getElementById('studio-export') as HTMLButtonElement;

let tokenOverrides: PartialTokenSet = {};

const settings = {
  themeName: 'outline-dark' as ThemePresetName,
  autoRotateEnabled: true,
  autoRotateSpeed: 0.4,
  hoverHudEnabled: true,
  zoomMode: 'attract' as ZoomMode,
  zoomStrength: 1,
  smoothZoom: true,
  clickToFocus: true,
  clickToPin: true,
  hoverOccludeBackSide: true,
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
    theme: { extends: themeName, tokens: tokenOverrides },
    countries: {
      resolution: 'low',
      style: 'borders',
      hoverEnabled: true,
      hoverOccludeBackSide: settings.hoverOccludeBackSide,
    },
    atmosphere: { enabled: true },
    autoRotate: { enabled: settings.autoRotateEnabled, speed: settings.autoRotateSpeed },
    zoom: { mode: settings.zoomMode, strength: settings.zoomStrength, smooth: settings.smoothZoom },
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
    if (settings.clickToFocus) {
      globe?.focusOnCountry(country.id);
      // focusOnCountry pauses auto-rotate by default — sync the UI checkbox.
      if (settings.autoRotateEnabled) {
        settings.autoRotateEnabled = false;
        $autoRotate.checked = false;
      }
    }
    if (settings.clickToPin) {
      globe?.setActiveCountry(country.id);
    }
  });

  globe.mount();
};

// ---------- Theme Studio ----------

const TOKEN_GROUPS: ReadonlyArray<readonly [string, ReadonlyArray<TokenKey>]> = [
  ['Background & Globe', ['background.color', 'globe.surfaceColor', 'globe.surfaceTextureUrl']],
  ['Borders', ['countries.border.color', 'countries.border.width', 'countries.border.opacity']],
  [
    'Country hover/active',
    [
      'countries.borderHover.color',
      'countries.borderHover.width',
      'countries.borderHover.opacity',
      'countries.borderActive.color',
      'countries.borderActive.width',
      'countries.borderActive.opacity',
    ],
  ],
  [
    'Tooltip',
    [
      'tooltip.backgroundColor',
      'tooltip.textColor',
      'tooltip.fontSize',
      'tooltip.fontFamily',
      'tooltip.padding',
      'tooltip.borderRadius',
    ],
  ],
  [
    'Lights',
    [
      'lights.ambient.color',
      'lights.ambient.intensity',
      'lights.directional.color',
      'lights.directional.intensity',
    ],
  ],
  ['Markers', ['markers.defaultColor']],
  ['Atmosphere', ['atmosphere.color', 'atmosphere.intensity']],
];

const isHexColor = (v: unknown): v is string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

const renderStudio = (): void => {
  const resolved = resolveTheme({ extends: settings.themeName, tokens: tokenOverrides });
  const presetTokens = THEME_PRESETS[settings.themeName];
  $studioBody.innerHTML = '';

  for (const [groupName, keys] of TOKEN_GROUPS) {
    const group = document.createElement('div');
    group.className = 'studio-group';
    const title = document.createElement('div');
    title.className = 'studio-group-title';
    title.textContent = groupName;
    group.appendChild(title);

    for (const key of keys) {
      const row = document.createElement('div');
      row.className = 'studio-row';

      const label = document.createElement('label');
      label.textContent = key;
      label.title = key;
      row.appendChild(label);

      const value = resolved[key];
      const isOverridden = key in tokenOverrides;

      let editor: HTMLInputElement;
      if (typeof value === 'number') {
        editor = document.createElement('input');
        editor.type = 'number';
        editor.step = key.toLowerCase().includes('intensity') || key.toLowerCase().includes('opacity') ? '0.1' : '1';
        editor.value = String(value);
        editor.addEventListener('input', () => {
          const num = Number.parseFloat(editor.value);
          if (Number.isFinite(num)) setOverride(key, num);
        });
      } else if (isHexColor(value)) {
        editor = document.createElement('input');
        editor.type = 'color';
        editor.value = value;
        editor.addEventListener('input', () => setOverride(key, editor.value));
      } else {
        editor = document.createElement('input');
        editor.type = 'text';
        editor.value = String(value);
        editor.addEventListener('change', () => setOverride(key, editor.value));
      }
      row.appendChild(editor);

      const reset = document.createElement('button');
      reset.className = 'studio-reset';
      reset.textContent = '↺';
      reset.title = `Reset to preset value (${String(presetTokens[key])})`;
      if (isOverridden) reset.classList.add('dirty');
      reset.addEventListener('click', () => clearOverride(key));
      row.appendChild(reset);

      group.appendChild(row);
    }
    $studioBody.appendChild(group);
  }
};

const setOverride = (key: TokenKey, value: string | number): void => {
  tokenOverrides = { ...tokenOverrides, [key]: value } as PartialTokenSet;
  buildGlobe(settings.themeName);
  renderStudio();
};

const clearOverride = (key: TokenKey): void => {
  const next = { ...tokenOverrides } as Record<string, unknown>;
  delete next[key];
  tokenOverrides = next as PartialTokenSet;
  buildGlobe(settings.themeName);
  renderStudio();
};

const resetAll = (): void => {
  tokenOverrides = {};
  buildGlobe(settings.themeName);
  renderStudio();
};

$studioResetAll.addEventListener('click', resetAll);
$studioExport.addEventListener('click', () => {
  const resolved = resolveTheme({ extends: settings.themeName, tokens: tokenOverrides });
  const json = JSON.stringify(resolved, null, 2);
  // eslint-disable-next-line no-console
  console.log('[Theme Export]\n' + json);
  navigator.clipboard?.writeText(json).then(
    () => setStatus('Theme exported to clipboard + console'),
    () => setStatus('Theme exported to console (clipboard blocked)')
  );
});

document.querySelectorAll<HTMLButtonElement>('button[data-theme]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const name = btn.dataset['theme'] as ThemePresetName;
    tokenOverrides = {}; // theme switch resets overrides
    buildGlobe(name);
    renderStudio();
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

const applyZoom = (): void => {
  globe?.update({
    zoom: {
      mode: settings.zoomMode,
      strength: settings.zoomStrength,
      smooth: settings.smoothZoom,
    },
  });
};

const updateZoomDisplay = (): void => {
  $zoomStrengthValue.textContent = settings.zoomStrength.toFixed(1);
  $zoomStrengthRow.style.display = settings.zoomMode === 'classic' ? 'none' : 'flex';
};

$zoomModeRadios.forEach((radio) => {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    settings.zoomMode = radio.value as ZoomMode;
    updateZoomDisplay();
    applyZoom();
  });
});

$zoomStrength.addEventListener('input', () => {
  settings.zoomStrength = Number.parseFloat($zoomStrength.value);
  updateZoomDisplay();
  applyZoom();
});

$smoothZoom.addEventListener('change', () => {
  settings.smoothZoom = $smoothZoom.checked;
  applyZoom();
});

$clickToFocus.addEventListener('change', () => {
  settings.clickToFocus = $clickToFocus.checked;
});

$flyHome.addEventListener('click', () => {
  globe?.flyTo([20, 0], 3, { duration: 1500 });
});

$clickToPin.addEventListener('change', () => {
  settings.clickToPin = $clickToPin.checked;
});

$clearActive.addEventListener('click', () => {
  globe?.setActiveCountry(null);
});

$hoverOcclude.addEventListener('change', () => {
  settings.hoverOccludeBackSide = $hoverOcclude.checked;
  // hoverOccludeBackSide is a constructor option for the highlight layer,
  // so we rebuild the globe instance to apply it cleanly.
  buildGlobe(settings.themeName);
});

updateSpeedDisplay();
updateZoomDisplay();
buildGlobe(settings.themeName);
renderStudio();

window.addEventListener('beforeunload', () => globe?.destroy());
