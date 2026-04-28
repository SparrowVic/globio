import {
  createGlobe,
  resolveTheme,
  PRESET_DEFAULT_KIND,
  THEME_PRESETS,
  G7,
  NATO,
  EU,
  BRICS,
  type CountryDataMap,
  type GlobeInstance,
  type GlobeKind,
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
const $countryLabels = document.getElementById('toggle-country-labels') as HTMLInputElement;
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
const $outlineGlow = document.getElementById('toggle-outline-glow') as HTMLInputElement;
const $outlinePulse = document.getElementById('toggle-outline-pulse') as HTMLInputElement;
const $outlineCrosshair = document.getElementById('toggle-outline-crosshair') as HTMLInputElement;
const $outlineContinentDim = document.getElementById('toggle-outline-continent-dim') as HTMLInputElement;
const $starfield = document.getElementById('toggle-starfield') as HTMLInputElement;
const $htmlMarkers = document.getElementById('toggle-html-markers') as HTMLInputElement;
const $axisTilt = document.getElementById('axis-tilt') as HTMLInputElement;
const $axisTiltValue = document.getElementById('axis-tilt-value') as HTMLSpanElement;
const $arcs = document.getElementById('toggle-arcs') as HTMLInputElement;
const $dottedRipple = document.getElementById('toggle-dotted-ripple') as HTMLInputElement;
const $dottedFlash = document.getElementById('toggle-dotted-flash') as HTMLInputElement;
const $dottedDrift = document.getElementById('toggle-dotted-drift') as HTMLInputElement;
const $dottedHover = document.getElementById('toggle-dotted-hover') as HTMLInputElement;
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
const $kindExtrasPanel = document.getElementById('kind-extras-panel') as HTMLDivElement;
const $kindExtrasTag = document.getElementById('kind-extras-tag') as HTMLSpanElement;
const $kindExtrasBlurb = document.getElementById('kind-extras-blurb') as HTMLParagraphElement;
const $kindExtrasSections = document.querySelectorAll<HTMLDivElement>(
  '#kind-extras-panel .kind-extras-section'
);
const $wireframeClickPulse = document.getElementById('toggle-wireframe-clickpulse') as HTMLInputElement;
const $wireframeEmphasis = document.getElementById('toggle-wireframe-emphasis') as HTMLInputElement;
const $wireframeGlitch = document.getElementById('toggle-wireframe-glitch') as HTMLInputElement;
const $wireframeActiveRing = document.getElementById('toggle-wireframe-activering') as HTMLInputElement;
const $wireframeStreams = document.getElementById('toggle-wireframe-streams') as HTMLInputElement;
const $paperGrid = document.getElementById('toggle-paper-grid') as HTMLInputElement;
const $paperFill = document.getElementById('toggle-paper-fill') as HTMLInputElement;

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
  outlineGlowEnabled: true,
  outlinePulseEnabled: true,
  outlineCrosshairEnabled: true,
  outlineContinentDimEnabled: true,
  starfieldEnabled: true,
  htmlMarkersEnabled: true,
  arcsEnabled: true,
  axisTilt: 23.5,
  dottedRippleEnabled: true,
  dottedFlashEnabled: true,
  dottedDriftEnabled: true,
  dottedHoverEnabled: true,
  wireframeClickPulse: true,
  wireframeEmphasis: true,
  wireframeGlitch: true,
  wireframeActiveRing: true,
  wireframeStreams: true,
  paperGrid: true,
  paperFill: true,
};

const WORLD_TOUR = {
  scenes: [
    // Intro: gentle ease-out + auto-rotate during scene
    {
      id: 'intro',
      duration: 5000,
      easing: 'easeOut' as const,
      autoRotate: true,
      flyTo: { position: [20, 0] as const, distance: 3 },
      popup: {
        position: [20, 0] as const,
        content:
          '<div style="background:rgba(10,14,30,0.9);border:1px solid #ffd700;color:#ffd700;padding:8px 12px;border-radius:6px;font-family:system-ui;font-size:12px">🌍 World Tour — sit back</div>',
      },
    },
    // Tight focus on Poland with smaller padding (more zoomed in), stop rotation
    {
      id: 'europe',
      duration: 5000,
      transitionDelay: 400,
      easing: 'easeInOut' as const,
      autoRotate: false,
      focusOnCountry: { id: '616', padding: 0.05 },
      activeCountry: '616',
      popup: {
        position: [52.2297, 21.0122] as const,
        content:
          '<div style="background:rgba(10,14,30,0.9);border:1px solid #4a9eff;color:#4a9eff;padding:8px 12px;border-radius:6px;font-family:system-ui;font-size:12px">🇵🇱 Warsaw — close-up</div>',
        anchor: 'bottom' as const,
      },
    },
    // Long jump to NYC: fly-over arc (elevation +1.0), longer transition
    {
      id: 'americas',
      duration: 5500,
      transitionDuration: 3500,
      transitionElevation: 1.0,
      easing: 'easeInOut' as const,
      flyTo: { position: [40.7128, -74.006] as const, distance: 2.6 },
      activeCountry: '840',
      popup: {
        position: [40.7128, -74.006] as const,
        content:
          '<div style="background:rgba(10,14,30,0.9);border:1px solid #ff5577;color:#ff5577;padding:8px 12px;border-radius:6px;font-family:system-ui;font-size:12px">🗽 New York — flew over the pole</div>',
        anchor: 'bottom' as const,
      },
    },
    // Asia jump: linear easing (constant velocity feel), big elevation
    {
      id: 'asia',
      duration: 5000,
      transitionDuration: 3000,
      transitionElevation: 1.2,
      easing: 'linear' as const,
      flyTo: { position: [35.6762, 139.6503] as const, distance: 2.6 },
      activeCountry: '392',
      popup: {
        position: [35.6762, 139.6503] as const,
        content:
          '<div style="background:rgba(10,14,30,0.9);border:1px solid #22ddaa;color:#22ddaa;padding:8px 12px;border-radius:6px;font-family:system-ui;font-size:12px">🗼 Tokyo</div>',
        anchor: 'bottom' as const,
      },
    },
    // Oceania: very tight zoom on Australia bbox, short delay
    {
      id: 'oceania',
      duration: 4500,
      transitionDelay: 200,
      easing: 'easeIn' as const,
      focusOnCountry: { id: '036', padding: 0.1 },
      activeCountry: '036',
      popup: {
        position: [-33.8688, 151.2093] as const,
        content:
          '<div style="background:rgba(10,14,30,0.9);border:1px solid #ffaa33;color:#ffaa33;padding:8px 12px;border-radius:6px;font-family:system-ui;font-size:12px">🦘 Sydney</div>',
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
  // Globe kind is auto-resolved from the theme preset (PRESET_DEFAULT_KIND
  // in core: outline-* → 'outline', 'dotted-dark' → 'dotted', 'wireframe-tron'
  // → 'wireframe'). No need to set `kind` explicitly here.
  globe = createGlobe({
    container,
    theme: { extends: themeName, tokens: tokenOverrides },
    countries: {
      resolution: 'low',
      hoverEnabled: true,
      hoverOccludeBackSide: settings.hoverOccludeBackSide,
    },
    atmosphere: { enabled: true },
    outline: {
      hoverGlow: { enabled: settings.outlineGlowEnabled },
      focusPulse: { enabled: settings.outlinePulseEnabled },
      hoverCrosshair: { enabled: settings.outlineCrosshairEnabled },
      continentDim: { enabled: settings.outlineContinentDimEnabled },
    },
    autoRotate: { enabled: settings.autoRotateEnabled, speed: settings.autoRotateSpeed },
    zoom: { mode: settings.zoomMode, strength: settings.zoomStrength, smooth: settings.smoothZoom },
    starfield: { enabled: settings.starfieldEnabled },
    axisTilt: settings.axisTilt,
    dotted: {
      clickRipple: { enabled: settings.dottedRippleEnabled },
      dataFlash: { enabled: settings.dottedFlashEnabled },
      drift: { enabled: settings.dottedDriftEnabled },
      hoverDots: { enabled: settings.dottedHoverEnabled },
    },
    htmlMarkers: settings.htmlMarkersEnabled ? HTML_MARKERS : [],
    arcs: settings.arcsEnabled ? ARCS : [],
    wireframe: {
      clickPulse: { enabled: settings.wireframeClickPulse },
      emphasis: { enabled: settings.wireframeEmphasis },
      glitch: { enabled: settings.wireframeGlitch },
      activeRing: { enabled: settings.wireframeActiveRing },
      poleStreams: { enabled: settings.wireframeStreams },
    },
    paper: {
      grid: { enabled: settings.paperGrid },
      fill: { enabled: settings.paperFill },
    },
    markers: [
      { id: 'waw', position: [52.2297, 21.0122], label: 'Warsaw', color: '#4a9eff' },
      { id: 'nyc', position: [40.7128, -74.006], label: 'New York', color: '#ff6b6b', pulse: true },
      { id: 'tyo', position: [35.6762, 139.6503], label: 'Tokyo', color: '#ffd166' },
      { id: 'syd', position: [-33.8688, 151.2093], label: 'Sydney', color: '#22ee99', size: 1.5 },
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

// ---------- Globe kind + theme variant selectors ----------

const $kindButtons = document.querySelectorAll<HTMLButtonElement>('#kind-buttons button');
const $themeButtons = document.querySelectorAll<HTMLButtonElement>('#theme-buttons button');

const themesForKind = (kind: GlobeKind): ReadonlyArray<HTMLButtonElement> =>
  Array.from($themeButtons).filter((btn) => btn.dataset['kind'] === kind);

// Short blurbs displayed under the Kind FX header — explain at a glance
// what's specific about the active kind. Keeps the panel from feeling like
// arbitrary checkboxes when you switch kinds.
const KIND_FX_BLURBS: Readonly<Record<GlobeKind, string>> = {
  outline:
    'Hover halo, focus sonar pulse, lat/lng crosshair, and continent-aware dim.',
  dotted:
    'Click ripples, data flashes, ambient drift, and hover dot expansion.',
  wireframe:
    'Click pulses, equator emphasis, CRT glitch, active-country ring, pole-to-pole streams.',
  paper: 'Hand-drawn borders, pastel fills, optional atlas grid.',
};

const refreshKindAndThemeUI = (themeName: ThemePresetName): void => {
  const activeKind = PRESET_DEFAULT_KIND[themeName] ?? 'outline';
  $kindButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset['kind'] === activeKind);
  });
  $themeButtons.forEach((btn) => {
    const matchesKind = btn.dataset['kind'] === activeKind;
    btn.hidden = !matchesKind;
    btn.classList.toggle('active', btn.dataset['theme'] === themeName);
  });

  // Side panel: surface only the section for the active kind, swap the
  // header tag + blurb to match. Hide the whole panel if the kind has no
  // section registered (none today, but reserves the slot).
  let anyVisible = false;
  $kindExtrasSections.forEach((section) => {
    const matches = section.dataset['kind'] === activeKind;
    section.classList.toggle('active', matches);
    if (matches) anyVisible = true;
  });
  $kindExtrasPanel.classList.toggle('hidden', !anyVisible);
  $kindExtrasTag.textContent = activeKind;
  $kindExtrasBlurb.textContent = KIND_FX_BLURBS[activeKind] ?? '';
};

const switchTheme = (themeName: ThemePresetName): void => {
  tokenOverrides = {}; // theme switch resets overrides
  buildGlobe(themeName);
  refreshKindAndThemeUI(themeName);
  renderStudio();
};

$kindButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const kind = btn.dataset['kind'] as GlobeKind | undefined;
    if (!kind) return;
    // Pick the first theme registered for this kind. Outline has 5
    // variants; dotted/wireframe currently have one each.
    const firstTheme = themesForKind(kind)[0]?.dataset['theme'] as ThemePresetName | undefined;
    if (firstTheme) switchTheme(firstTheme);
  });
});

$themeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset['theme'] as ThemePresetName | undefined;
    if (theme) switchTheme(theme);
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

$countryLabels.addEventListener('change', () => {
  globe?.setCountryLabelsEnabled($countryLabels.checked);
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
$dottedRipple.addEventListener('change', () => {
  settings.dottedRippleEnabled = $dottedRipple.checked;
  buildGlobe(settings.themeName);
});
$dottedFlash.addEventListener('change', () => {
  settings.dottedFlashEnabled = $dottedFlash.checked;
  buildGlobe(settings.themeName);
});
$dottedDrift.addEventListener('change', () => {
  settings.dottedDriftEnabled = $dottedDrift.checked;
  buildGlobe(settings.themeName);
});
$dottedHover.addEventListener('change', () => {
  settings.dottedHoverEnabled = $dottedHover.checked;
  buildGlobe(settings.themeName);
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

$outlineGlow.addEventListener('change', () => {
  settings.outlineGlowEnabled = $outlineGlow.checked;
  buildGlobe(settings.themeName);
});

$outlinePulse.addEventListener('change', () => {
  settings.outlinePulseEnabled = $outlinePulse.checked;
  buildGlobe(settings.themeName);
});

$outlineCrosshair.addEventListener('change', () => {
  settings.outlineCrosshairEnabled = $outlineCrosshair.checked;
  buildGlobe(settings.themeName);
});

$outlineContinentDim.addEventListener('change', () => {
  settings.outlineContinentDimEnabled = $outlineContinentDim.checked;
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

// ---------- Country data demos ----------

const $dataNato = document.getElementById('data-nato') as HTMLButtonElement;
const $dataEu = document.getElementById('data-eu') as HTMLButtonElement;
const $dataG7 = document.getElementById('data-g7') as HTMLButtonElement;
const $dataBrics = document.getElementById('data-brics') as HTMLButtonElement;
const $dataPopReds = document.getElementById('data-pop-reds') as HTMLButtonElement;
const $dataPopViridis = document.getElementById('data-pop-viridis') as HTMLButtonElement;
const $dataGrowth = document.getElementById('data-growth') as HTMLButtonElement;
const $dataClear = document.getElementById('data-clear') as HTMLButtonElement;


const POPULATION: ReadonlyArray<readonly [string, number]> = [
  ['156', 1411], // China
  ['356', 1393], // India
  ['840', 332],  // USA
  ['360', 274],  // Indonesia
  ['586', 220],  // Pakistan
  ['76', 213],   // Brazil
  ['566', 211],  // Nigeria
  ['50', 165],   // Bangladesh
  ['643', 144],  // Russia
  ['484', 130],  // Mexico
  ['392', 125],  // Japan
  ['231', 118],  // Ethiopia
  ['608', 109],  // Philippines
  ['818', 104],  // Egypt
  ['704', 98],   // Vietnam
  ['180', 96],   // DR Congo
  ['792', 85],   // Turkey
  ['364', 84],   // Iran
  ['276', 84],   // Germany
  ['764', 70],   // Thailand
  ['826', 67],   // UK
  ['250', 65],   // France
  ['710', 60],   // South Africa
  ['380', 59],   // Italy
  ['724', 47],   // Spain
  ['616', 38],   // Poland
];

// Hand-picked sample of recent annual GDP growth rates (% YoY). Mix of
// negatives and positives so the diverging scale has something to do.
const GDP_GROWTH: ReadonlyArray<readonly [string, number]> = [
  ['840', 2.5],   // USA
  ['156', 5.2],   // China
  ['356', 7.6],   // India
  ['276', -0.3],  // Germany
  ['826', 0.4],   // UK
  ['250', 0.7],   // France
  ['380', 0.9],   // Italy
  ['724', 2.4],   // Spain
  ['616', 3.0],   // Poland
  ['392', 1.9],   // Japan
  ['410', 1.4],   // South Korea
  ['76', 2.9],    // Brazil
  ['484', 3.2],   // Mexico
  ['32', -2.5],   // Argentina
  ['643', 3.6],   // Russia
  ['792', 4.5],   // Turkey
  ['818', 3.0],   // Egypt
  ['710', 0.6],   // South Africa
  ['566', 2.9],   // Nigeria
  ['36', 2.0],    // Australia
  ['124', 1.1],   // Canada
  ['682', -0.8],  // Saudi Arabia
];

const buildSetMap = (ids: ReadonlyArray<string>, color: string): CountryDataMap => {
  const map: Record<string, { color: string; opacity: number }> = {};
  for (const id of ids) map[id] = { color, opacity: 0.85 };
  return map;
};

const buildValueMap = (
  rows: ReadonlyArray<readonly [string, number]>
): CountryDataMap => {
  const map: Record<string, { value: number; opacity: number }> = {};
  for (const [id, v] of rows) map[id] = { value: v, opacity: 0.85 };
  return map;
};

$dataNato.addEventListener('click', () => {
  globe?.setCountryData(buildSetMap(NATO, '#1e6fff'));
  globe?.showLegend(
    { type: 'categorical', colors: { 'NATO member': '#1e6fff' } },
    { title: 'NATO membership' }
  );
  setStatus(`Country data: NATO members (${NATO.length})`);
});
$dataEu.addEventListener('click', () => {
  globe?.setCountryData(buildSetMap(EU, '#ffd700'));
  globe?.showLegend(
    { type: 'categorical', colors: { 'EU member': '#ffd700' } },
    { title: 'EU membership' }
  );
  setStatus(`Country data: EU members (${EU.length})`);
});
$dataG7.addEventListener('click', () => {
  globe?.setCountryData(buildSetMap(G7, '#22c55e'));
  globe?.showLegend(
    { type: 'categorical', colors: { 'G7 member': '#22c55e' } },
    { title: 'G7 membership' }
  );
  setStatus(`Country data: G7 (${G7.length})`);
});
$dataBrics.addEventListener('click', () => {
  globe?.setCountryData(buildSetMap(BRICS, '#a855f7'));
  globe?.showLegend(
    { type: 'categorical', colors: { 'BRICS member': '#a855f7' } },
    { title: 'BRICS+ membership' }
  );
  setStatus(`Country data: BRICS+ (${BRICS.length})`);
});
$dataPopReds.addEventListener('click', () => {
  const scale = {
    type: 'sequential',
    palette: 'reds',
    domain: [0, 1500],
  } as const;
  globe?.setCountryData(buildValueMap(POPULATION), scale);
  globe?.showLegend(scale, {
    title: 'Population (millions)',
    format: (v) => Math.round(v).toString(),
  });
  setStatus('Country data: population · reds');
});
$dataPopViridis.addEventListener('click', () => {
  const scale = {
    type: 'sequential',
    palette: 'viridis',
    domain: [0, 1500],
  } as const;
  globe?.setCountryData(buildValueMap(POPULATION), scale);
  globe?.showLegend(scale, {
    title: 'Population (millions)',
    format: (v) => Math.round(v).toString(),
  });
  setStatus('Country data: population · viridis');
});
$dataGrowth.addEventListener('click', () => {
  const scale = {
    type: 'diverging',
    palette: 'RdBu',
    domain: [-5, 0, 8],
  } as const;
  globe?.setCountryData(buildValueMap(GDP_GROWTH), scale);
  globe?.showLegend(scale, {
    title: 'GDP growth (% YoY)',
    format: (v) => v.toFixed(1) + '%',
    tickCount: 3,
  });
  setStatus('Country data: GDP growth (RdBu diverging)');
});
$dataClear.addEventListener('click', () => {
  globe?.setCountryData(null);
  globe?.hideLegend();
  setStatus('Country data: cleared');
});

$wireframeClickPulse.addEventListener('change', () => {
  settings.wireframeClickPulse = $wireframeClickPulse.checked;
  buildGlobe(settings.themeName);
});
$wireframeEmphasis.addEventListener('change', () => {
  settings.wireframeEmphasis = $wireframeEmphasis.checked;
  buildGlobe(settings.themeName);
});
$wireframeGlitch.addEventListener('change', () => {
  settings.wireframeGlitch = $wireframeGlitch.checked;
  buildGlobe(settings.themeName);
});
$wireframeActiveRing.addEventListener('change', () => {
  settings.wireframeActiveRing = $wireframeActiveRing.checked;
  buildGlobe(settings.themeName);
});
$wireframeStreams.addEventListener('change', () => {
  settings.wireframeStreams = $wireframeStreams.checked;
  buildGlobe(settings.themeName);
});
$paperGrid.addEventListener('change', () => {
  settings.paperGrid = $paperGrid.checked;
  buildGlobe(settings.themeName);
});
$paperFill.addEventListener('change', () => {
  settings.paperFill = $paperFill.checked;
  buildGlobe(settings.themeName);
});

updateSpeedDisplay();
updateZoomDisplay();
buildGlobe(settings.themeName);
refreshKindAndThemeUI(settings.themeName);
renderStudio();

window.addEventListener('beforeunload', () => globe?.destroy());
