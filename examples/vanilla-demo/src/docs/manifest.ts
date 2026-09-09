import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faBookOpen, faCode, faLayerGroup, faSliders, faWandMagicSparkles } from '@fortawesome/sharp-solid-svg-icons';
import type { GlobeKind } from '@your-globe/core';
import type { FrameworkId } from './frameworks';

/**
 * The documentation map. Three levels: a tab (what kind of reading this
 * is), a group (one topic), a page. Every page slug is a stable URL under
 * `/docs/` — links inside the docs and the Studio help tips point at
 * these slugs, so renaming one is a breaking change.
 */
export interface DocPageMeta {
  readonly slug: string;
  readonly title: string;
  /** Config path or API call the page is about, shown above the title. */
  readonly eyebrow?: string;
  readonly summary: string;
  /** Kind pages carry their kind so the page can pick its accent and preview. */
  readonly kind?: GlobeKind;
  /** Framework pages pin every code panel to this framework. */
  readonly framework?: FrameworkId;
}

export interface DocGroup {
  readonly id: string;
  readonly label: string;
  readonly pages: ReadonlyArray<DocPageMeta>;
}

export interface DocTab {
  readonly id: string;
  readonly label: string;
  readonly icon: IconDefinition;
  readonly description: string;
  readonly groups: ReadonlyArray<DocGroup>;
}

export const DOCS_ROOT = '/docs';
export const DOCS_VERSION = 'v0.1.0';

const page = (slug: string, title: string, summary: string, extra: Partial<DocPageMeta> = {}): DocPageMeta => ({
  slug,
  title,
  summary,
  ...extra,
});

export const DOCS_TABS: ReadonlyArray<DocTab> = [
  {
    id: 'guide',
    label: 'Guide',
    icon: faBookOpen,
    description: 'From install to a styled, data-driven globe. Read in order or jump to a topic.',
    groups: [
      {
        id: 'start',
        label: 'Start',
        pages: [
          page('start/introduction', 'Introduction', 'What Globio is, what it renders and what it deliberately leaves out.', { eyebrow: '@your-globe/core' }),
          page('start/installation', 'Installation', 'Add the engine and a wrapper to a Vite, Next, Nuxt or Angular project.', { eyebrow: 'npm i @your-globe/core' }),
          page('start/first-globe', 'Your first globe', 'Mount a globe, pick a kind, react to a click. Five minutes.', { eyebrow: 'createGlobe()' }),
          page('start/choosing-a-kind', 'Choosing a kind', 'Six renderers, one config. Which one fits a dashboard, a hero, a status view.', { eyebrow: "kind: 'outline'" }),
        ],
      },
      {
        id: 'kinds',
        label: 'Kinds',
        pages: [
          page('kinds/overview', 'All kinds', 'Side by side: what each kind draws, which layers it supports, what it costs.', { eyebrow: 'GlobeKind' }),
          page('kinds/cinematic', 'Cinematic', 'A filmic Earth with relief, clouds, a sun you can pin and HDR bloom.', { eyebrow: "kind: 'cinematic'", kind: 'cinematic' }),
          page('kinds/outline', 'Outline', 'The default. Crisp borders, hover and active states, a lat/lng crosshair.', { eyebrow: "kind: 'outline'", kind: 'outline' }),
          page('kinds/dotted', 'Dotted', 'Continents as tuned dot fields; data runs through the dots themselves.', { eyebrow: "kind: 'dotted'", kind: 'dotted' }),
          page('kinds/wireframe', 'Wireframe', 'A latitude and longitude grid over glass with pulses and streams.', { eyebrow: "kind: 'wireframe'", kind: 'wireframe' }),
          page('kinds/hologram', 'Hologram', 'Scanlines, a fresnel rim and a shimmer that never sits still.', { eyebrow: "kind: 'hologram'", kind: 'hologram' }),
          page('kinds/paper', 'Paper', 'Ink on grain with atlas labels. The warm one.', { eyebrow: "kind: 'paper'", kind: 'paper' }),
        ],
      },
      {
        id: 'appearance',
        label: 'Appearance',
        pages: [
          page('appearance/themes', 'Themes and presets', 'Thirteen presets, and how to extend one with your own tokens.', { eyebrow: "theme: 'outline-cyber'" }),
          page('appearance/tokens', 'Theme tokens', 'Every colour, width and opacity the renderers read, by path.', { eyebrow: 'theme.tokens' }),
          page('appearance/atmosphere', 'Atmosphere and sky', 'Rim glow, starfield and backgrounds.', { eyebrow: 'atmosphere' }),
          page('appearance/countries', 'Countries', 'Resolution, borders, fills, hover and active styling.', { eyebrow: 'countries' }),
          page('appearance/postprocessing', 'Post-processing', 'Bloom, streaks and grading for the cinematic kind.', { eyebrow: 'postprocessing' }),
        ],
      },
      {
        id: 'camera',
        label: 'Camera and motion',
        pages: [
          page('camera/position', 'Position and framing', 'Initial position, axis tilt, zoom limits and framing padding.', { eyebrow: 'initialPosition' }),
          page('camera/auto-rotate', 'Auto-rotate', 'Ambient rotation that yields to the user and resumes.', { eyebrow: 'autoRotate' }),
          page('camera/fly-to', 'flyTo and focusOnCountry', 'Animated camera moves with easing and completion callbacks.', { eyebrow: 'globe.flyTo()' }),
          page('camera/zoom', 'Zoom and controls', 'Wheel, pinch, drag, inertia and the locked-zoom decoration mode.', { eyebrow: 'zoom' }),
        ],
      },
      {
        id: 'data',
        label: 'Data layers',
        pages: [
          page('data/country-data', 'Country data', 'Choropleths: keyed values, scales, legends and live updates.', { eyebrow: 'globe.setCountryData()' }),
          page('data/markers', 'Markers', 'Pins with pulse, hover scale and payloads. HTML markers for anything richer.', { eyebrow: 'markers' }),
          page('data/arcs', 'Arcs', 'Great-circle connections with height, dashes and animation.', { eyebrow: 'arcs' }),
          page('data/labels', 'Labels', 'Country labels and custom label maps.', { eyebrow: 'countryLabels' }),
          page('data/legends', 'Scales and legends', 'Colour scales and the built-in legend overlay.', { eyebrow: 'ScaleConfig' }),
          page('data/data-layers', 'Data layers', 'Bars, extruded countries, heatmaps, hex bins and charts on top of any kind.', { eyebrow: 'globe.setDataLayer()' }),
        ],
      },
      {
        id: 'interaction',
        label: 'Interaction',
        pages: [
          page('interaction/events', 'Events', 'Every event the globe emits and what its payload carries.', { eyebrow: 'globe.on()' }),
          page('interaction/selection', 'Hover and selection', 'Active country, hover occlusion and programmatic selection.', { eyebrow: 'setActiveCountry()' }),
          page('interaction/projection', 'Projection and picking', 'Turn lat/lng into pixels for overlays, and pixels back into countries.', { eyebrow: 'globe.project()' }),
        ],
      },
      {
        id: 'story',
        label: 'Story',
        pages: [
          page('story/engine', 'Story engine', 'Scenes, transitions and playback for narrative globes.', { eyebrow: 'setStory()' }),
        ],
      },
      {
        id: 'performance',
        label: 'Performance',
        pages: [
          page('performance/overview', 'Performance', 'Resolution levels, pixel ratio, adaptive quality and the frame budget.', { eyebrow: 'performance' }),
          page('performance/pausing', 'Pausing and visibility', 'Pause hidden globes, keep several warm, resume without a flash.', { eyebrow: 'globe.setPaused()' }),
          page('performance/timing', 'Timing marks', 'The User Timing marks the engine emits and how to read them.', { eyebrow: 'globio:kind-build' }),
        ],
      },
    ],
  },
  {
    id: 'recipes',
    label: 'Recipes',
    icon: faWandMagicSparkles,
    description: 'Complete builds to copy: a dashboard, a route map, a narrated landing, a hero, a live feed.',
    groups: [
      {
        id: 'recipes',
        label: 'Recipes',
        pages: [
          page('recipes/overview', 'All recipes', 'Five complete builds, each with a live preview and the full config behind it.', { eyebrow: 'copy · adapt · ship' }),
          page('recipes/choropleth-dashboard', 'Choropleth dashboard', 'Country values through a scale, a legend, and a click that selects a country.', { eyebrow: 'setCountryData()' }),
          page('recipes/flight-routes', 'Flight routes', 'Hubs as pulsing markers and routes as animated arcs.', { eyebrow: 'arcs · markers' }),
          page('recipes/story-landing', 'Story-driven landing', 'A looping story that flies between three countries, with captions driven by scene events.', { eyebrow: 'setStory()' }),
          page('recipes/hero-globe', 'Hero globe', 'A decorative cinematic globe behind a headline: padded framing, locked zoom, paused off-screen.', { eyebrow: 'framing.lockZoom' }),
          page('recipes/live-feed', 'Live data feed', 'Markers that arrive over time, pulse on arrival, and are capped so the globe stays readable.', { eyebrow: 'addMarker()' }),
        ],
      },
    ],
  },
  {
    id: 'api',
    label: 'API',
    icon: faCode,
    description: 'The reference. Every config key, method, event and type, with defaults.',
    groups: [
      {
        id: 'entry',
        label: 'Entry point',
        pages: [
          page('api/create-globe', 'createGlobe', 'The factory: takes a GlobeConfig, returns a GlobeInstance.', { eyebrow: 'createGlobe(config)' }),
          page('api/globe-config', 'GlobeConfig', 'Top-level configuration keys, grouped by what they control.', { eyebrow: 'GlobeConfig' }),
        ],
      },
      {
        id: 'instance',
        label: 'Instance',
        pages: [
          page('api/globe-instance', 'GlobeInstance', 'Lifecycle, camera, data, story and export methods.', { eyebrow: 'GlobeInstance' }),
          page('api/events', 'Events', 'The GlobeEvents map and payload types.', { eyebrow: 'GlobeEvents' }),
        ],
      },
      {
        id: 'types',
        label: 'Types',
        pages: [
          page('api/markers-and-arcs', 'Markers and arcs', 'MarkerConfig, HtmlMarkerConfig and ArcConfig.', { eyebrow: 'MarkerConfig' }),
          page('api/story-types', 'Story types', 'StoryConfig, SceneConfig and scene events.', { eyebrow: 'StoryConfig' }),
          page('api/scales', 'Scales', 'ScaleConfig and legend options.', { eyebrow: 'ScaleConfig' }),
          page('api/theme-types', 'Theme types', 'TokenSet, ThemeInput and preset names.', { eyebrow: 'ThemePresetName' }),
        ],
      },
      {
        id: 'utilities',
        label: 'Utilities',
        pages: [
          page('api/easing', 'Easing', 'linear, easeOutCubic, easeInOutCubic and custom curves.', { eyebrow: 'easeOutCubic' }),
          page('api/country-ids', 'Country ids', 'normalizeCountryId and normalizeCountryKeys.', { eyebrow: 'normalizeCountryId()' }),
          page('api/presets', 'Presets', 'THEME_PRESETS and PRESET_DEFAULT_KIND.', { eyebrow: 'PRESET_DEFAULT_KIND' }),
        ],
      },
    ],
  },
  {
    id: 'frameworks',
    label: 'Frameworks',
    icon: faLayerGroup,
    description: 'The wrappers. Same config, idiomatic props and events for each framework.',
    groups: [
      {
        id: 'packages',
        label: 'Packages',
        pages: [
          page('frameworks/vanilla', 'Vanilla', 'The engine on its own, with any bundler or none.', { eyebrow: '@your-globe/core', framework: 'vanilla' }),
          page('frameworks/react', 'React', 'The <Globe /> component, its ref handle and callbacks.', { eyebrow: '@your-globe/react', framework: 'react' }),
          page('frameworks/vue', 'Vue', '<VueGlobe /> with kebab-case props and emits.', { eyebrow: '@your-globe/vue', framework: 'vue' }),
          page('frameworks/angular', 'Angular', 'The standalone <ng-globe> component with inputs and outputs.', { eyebrow: '@your-globe/angular', framework: 'angular' }),
        ],
      },
      {
        id: 'guides',
        label: 'Guides',
        pages: [
          page('frameworks/ssr', 'Server rendering', 'Next, Nuxt and Angular Universal: mount on the client only.', { eyebrow: 'typeof window' }),
          page('frameworks/bundlers', 'Bundlers and CDNs', 'Vite, webpack, import maps and the three.js peer dependency.', { eyebrow: 'peerDependencies' }),
        ],
      },
    ],
  },
  {
    id: 'studio',
    label: 'Studio',
    icon: faSliders,
    description: 'The configurator. Design a globe visually, export the exact config.',
    groups: [
      {
        id: 'studio',
        label: 'Studio',
        pages: [
          page('studio/overview', 'Studio overview', 'What the panels do and how a session turns into code.', { eyebrow: '/studio' }),
          page('studio/export', 'Export and open projects', 'Generate framework code, download runtime JSON, and save or open editable Studio projects.', { eyebrow: 'Export & open' }),
          page('studio/presets', 'Presets and saved themes', 'Start from a preset, save your own themes and presets in the browser.', { eyebrow: 'Apply preset' }),
          page('studio/shortcuts', 'Command palette', 'Every action, kind, theme and preset from one keyboard chord.', { eyebrow: '⌘K' }),
        ],
      },
    ],
  },
];

export interface DocLocation {
  readonly tab: DocTab;
  readonly group: DocGroup;
  readonly page: DocPageMeta;
  readonly prev?: DocPageMeta;
  readonly next?: DocPageMeta;
}

export const pageHref = (slug: string): string => `${DOCS_ROOT}/${slug}`;

export const flatPages = (tab: DocTab): ReadonlyArray<DocPageMeta> => tab.groups.flatMap((g) => g.pages);

export const allPages = (): ReadonlyArray<DocPageMeta & { readonly tab: DocTab; readonly group: DocGroup }> =>
  DOCS_TABS.flatMap((tab) => tab.groups.flatMap((group) => group.pages.map((p) => ({ ...p, tab, group }))));

/** First page of a tab — where the tab link in the top bar goes. */
export const tabHref = (tab: DocTab): string => {
  const first = tab.groups[0]?.pages[0];
  return first ? pageHref(first.slug) : DOCS_ROOT;
};

export const findPage = (slug: string): DocLocation | null => {
  for (const tab of DOCS_TABS) {
    for (const group of tab.groups) {
      const page = group.pages.find((p) => p.slug === slug);
      if (!page) continue;
      const flat = flatPages(tab);
      const i = flat.findIndex((p) => p.slug === slug);
      return { tab, group, page, prev: flat[i - 1], next: flat[i + 1] };
    }
  }
  return null;
};
