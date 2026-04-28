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
const $starfield = document.getElementById('toggle-starfield') as HTMLInputElement;
const $htmlMarkers = document.getElementById('toggle-html-markers') as HTMLInputElement;
const $axisTilt = document.getElementById('axis-tilt') as HTMLInputElement;
const $axisTiltValue = document.getElementById('axis-tilt-value') as HTMLSpanElement;
const $arcs = document.getElementById('toggle-arcs') as HTMLInputElement;
const $snapshot = document.getElementById('btn-snapshot') as HTMLButtonElement;
const $storyPrev = document.getElementById('story-prev') as HTMLButtonElement;
const $storyPlay = document.getElementById('story-play') as HTMLButtonElement;
const $storyNext = document.getElementById('story-next') as HTMLButtonElement;
const $storyStatus = document.getElementById('story-status') as HTMLSpanElement;
const $studioBody = document.getElementById('studio-body') as HTMLDivElement;
const $studioResetAll = document.getElementById('studio-reset-all') as HTMLButtonElement;
const $studioExport = document.getElementById('studio-export') as HTMLButtonElement;
const $studio = document.getElementById('studio') as HTMLDivElement;
const $studioClose = document.getElementById('studio-close') as HTMLButtonElement;
const $studioOpen = document.getElementById('studio-open') as HTMLButtonElement;

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
  starfieldEnabled: true,
  htmlMarkersEnabled: true,
  arcsEnabled: true,
  axisTilt: 23.5,
};

const WORLD_TOUR = {
  scenes: [
    {
      id: 'intro',
      duration: 4000,
      flyTo: { position: [20, 0] as const, distance: 3 },
      popup: {
        position: [20, 0] as const,
        content:
          '<div style="background:rgba(10,14,30,0.9);border:1px solid #ffd700;color:#ffd700;padding:8px 12px;border-radius:6px;font-family:system-ui;font-size:12px">🌍 World Tour — sit back, scroll handed</div>',
      },
    },
    {
      id: 'europe',
      duration: 4500,
      focusOnCountry: '616',
      activeCountry: '616',
      popup: {
        position: [52.2297, 21.0122] as const,
        content:
          '<div style="background:rgba(10,14,30,0.9);border:1px solid #4a9eff;color:#4a9eff;padding:8px 12px;border-radius:6px;font-family:system-ui;font-size:12px">🇵🇱 Warsaw, Poland</div>',
        anchor: 'bottom' as const,
      },
    },
    {
      id: 'americas',
      duration: 4500,
      flyTo: { position: [40.7128, -74.006] as const, distance: 2.6 },
      activeCountry: '840',
      popup: {
        position: [40.7128, -74.006] as const,
        content:
          '<div style="background:rgba(10,14,30,0.9);border:1px solid #ff5577;color:#ff5577;padding:8px 12px;border-radius:6px;font-family:system-ui;font-size:12px">🗽 New York, USA</div>',
        anchor: 'bottom' as const,
      },
    },
    {
      id: 'asia',
      duration: 4500,
      flyTo: { position: [35.6762, 139.6503] as const, distance: 2.6 },
      activeCountry: '392',
      popup: {
        position: [35.6762, 139.6503] as const,
        content:
          '<div style="background:rgba(10,14,30,0.9);border:1px solid #22ddaa;color:#22ddaa;padding:8px 12px;border-radius:6px;font-family:system-ui;font-size:12px">🗼 Tokyo, Japan</div>',
        anchor: 'bottom' as const,
      },
    },
    {
      id: 'oceania',
      duration: 4500,
      flyTo: { position: [-33.8688, 151.2093] as const, distance: 2.6 },
      activeCountry: '036',
      popup: {
        position: [-33.8688, 151.2093] as const,
        content:
          '<div style="background:rgba(10,14,30,0.9);border:1px solid #ffaa33;color:#ffaa33;padding:8px 12px;border-radius:6px;font-family:system-ui;font-size:12px">🦘 Sydney, Australia</div>',
        anchor: 'bottom' as const,
      },
    },
  ],
  loop: true,
};

const ARCS = [
  // Solid arc, fixed height, classic constant-speed head
  {
    id: 'waw-nyc',
    from: [52.2297, 21.0122] as const,
    to: [40.7128, -74.006] as const,
    animated: true,
    headEasing: 'linear' as const,
  },
  // Auto-height: long route → tall arc, ease-in-out head feels "thrown"
  {
    id: 'nyc-tyo',
    from: [40.7128, -74.006] as const,
    to: [35.6762, 139.6503] as const,
    height: 'auto' as const,
    animated: true,
    animationDuration: 3,
    headEasing: 'easeInOut' as const,
  },
  // Dashed style with pulse head (fades in middle, gone at endpoints)
  {
    id: 'tyo-syd',
    from: [35.6762, 139.6503] as const,
    to: [-33.8688, 151.2093] as const,
    style: 'dashed' as const,
    dashSize: 0.04,
    dashGap: 0.025,
    animated: true,
    animationDuration: 2.5,
    headEasing: 'pulse' as const,
  },
  // Long return leg: auto-height max, slow cycle
  {
    id: 'syd-waw',
    from: [-33.8688, 151.2093] as const,
    to: [52.2297, 21.0122] as const,
    height: 'auto' as const,
    minHeight: 0.2,
    maxHeight: 0.7,
    animated: true,
    animationDuration: 4,
    headEasing: 'linear' as const,
  },
];

const HTML_MARKERS = [
  {
    id: 'london',
    position: [51.5074, -0.1278] as const,
    content: '<div style="background:rgba(20,20,40,0.8);border:1px solid #4a9eff;color:#cfd8ff;padding:6px 10px;border-radius:4px;font-size:12px;white-space:nowrap;font-family:system-ui">🇬🇧 London</div>',
    anchor: 'bottom' as const,
  },
  {
    id: 'rio',
    position: [-22.9068, -43.1729] as const,
    content: '<div style="background:rgba(40,20,30,0.8);border:1px solid #ffd166;color:#ffe9a0;padding:6px 10px;border-radius:4px;font-size:12px;white-space:nowrap;font-family:system-ui">🇧🇷 Rio</div>',
    anchor: 'bottom' as const,
  },
  {
    id: 'singapore',
    position: [1.3521, 103.8198] as const,
    content: '<div style="background:rgba(0,30,30,0.8);border:1px solid #22ee99;color:#22ee99;padding:6px 10px;border-radius:4px;font-size:12px;white-space:nowrap;font-family:system-ui">🇸🇬 Singapore</div>',
    anchor: 'bottom' as const,
  },
];

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
    starfield: { enabled: settings.starfieldEnabled },
    axisTilt: settings.axisTilt,
    htmlMarkers: settings.htmlMarkersEnabled ? HTML_MARKERS : [],
    arcs: settings.arcsEnabled ? ARCS : [],
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
  globe.on('sceneEnter', () => renderStoryStatus());
  globe.on('sceneExit', () => renderStoryStatus());
  globe.on('storyComplete', () => {
    $storyPlay.textContent = '▶ Play tour';
    renderStoryStatus();
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

const setStudioVisible = (visible: boolean): void => {
  $studio.style.display = visible ? 'block' : 'none';
  $studioOpen.style.display = visible ? 'none' : 'block';
};
$studioClose.addEventListener('click', () => setStudioVisible(false));
$studioOpen.addEventListener('click', () => setStudioVisible(true));

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

$starfield.addEventListener('change', () => {
  settings.starfieldEnabled = $starfield.checked;
  buildGlobe(settings.themeName);
});
$htmlMarkers.addEventListener('change', () => {
  settings.htmlMarkersEnabled = $htmlMarkers.checked;
  globe?.setHtmlMarkers(settings.htmlMarkersEnabled ? HTML_MARKERS : []);
});
$arcs.addEventListener('change', () => {
  settings.arcsEnabled = $arcs.checked;
  globe?.setArcs(settings.arcsEnabled ? ARCS : []);
});
$snapshot.addEventListener('click', async () => {
  if (!globe) return;
  const dataUrl = await globe.toImage({ width: 2048, height: 2048 });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `globio-${Date.now()}.png`;
  link.click();
  setStatus('Snapshot saved (PNG, 2048×2048)');
});
$axisTilt.addEventListener('input', () => {
  settings.axisTilt = Number.parseFloat($axisTilt.value);
  $axisTiltValue.textContent = `${settings.axisTilt.toFixed(1)}°`;
  buildGlobe(settings.themeName);
});

$hoverOcclude.addEventListener('change', () => {
  settings.hoverOccludeBackSide = $hoverOcclude.checked;
  // hoverOccludeBackSide is a constructor option for the highlight layer,
  // so we rebuild the globe instance to apply it cleanly.
  buildGlobe(settings.themeName);
});

// ---------- Story controls ----------

const renderStoryStatus = (): void => {
  if (!globe) {
    $storyStatus.textContent = 'No story';
    return;
  }
  const scene = globe.getCurrentScene();
  if (!scene) {
    $storyStatus.textContent = 'Story idle';
    return;
  }
  const playing = globe.isStoryPlaying() ? '▶ playing' : '⏸ paused';
  $storyStatus.textContent = `${playing} — scene ${scene.id}`;
};

$storyPlay.addEventListener('click', () => {
  if (!globe) return;
  if (globe.isStoryPlaying()) {
    globe.pauseStory();
    $storyPlay.textContent = '▶ Play tour';
  } else {
    globe.setStory(WORLD_TOUR);
    globe.playStory();
    $storyPlay.textContent = '⏸ Pause';
  }
  renderStoryStatus();
});

$storyPrev.addEventListener('click', () => {
  globe?.prevScene();
  renderStoryStatus();
});

$storyNext.addEventListener('click', () => {
  globe?.nextScene();
  renderStoryStatus();
});

updateSpeedDisplay();
updateZoomDisplay();
buildGlobe(settings.themeName);
renderStudio();

window.addEventListener('beforeunload', () => globe?.destroy());
