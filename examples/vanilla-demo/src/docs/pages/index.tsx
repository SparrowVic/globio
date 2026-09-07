import type { ComponentType } from 'react';
import type { DocLocation } from '@/docs/manifest';
import { Atmosphere } from './appearance/Atmosphere';
import { Countries } from './appearance/Countries';
import { Postprocessing } from './appearance/Postprocessing';
import { Themes } from './appearance/Themes';
import { Tokens } from './appearance/Tokens';
import { CreateGlobe } from './api/CreateGlobe';
import { EventsPage } from './api/EventsPage';
import { GlobeConfigPage } from './api/GlobeConfigPage';
import { GlobeInstancePage } from './api/GlobeInstance';
import { TypesPage } from './api/TypesPage';
import { CountryIdsPage, EasingPage, PresetsPage } from './api/Utilities';
import { AutoRotate } from './camera/AutoRotate';
import { FlyTo } from './camera/FlyTo';
import { Position } from './camera/Position';
import { Zoom } from './camera/Zoom';
import { Arcs } from './data/Arcs';
import { CountryData } from './data/CountryData';
import { DataLayers } from './data/DataLayers';
import { Labels } from './data/Labels';
import { Legends } from './data/Legends';
import { Markers } from './data/Markers';
import { FrameworkPage } from './frameworks/FrameworkPage';
import { BundlersPage, SsrPage } from './frameworks/Guides';
import { EventsGuide } from './interaction/Events';
import { Projection } from './interaction/Projection';
import { Selection } from './interaction/Selection';
import { KindPage } from './kinds/KindPage';
import { KindsOverview } from './kinds/KindsOverview';
import { PerformanceOverview } from './performance/Overview';
import { Pausing } from './performance/Pausing';
import { Timing } from './performance/Timing';
import { SkeletonPage } from './SkeletonPage';
import { ChoosingAKind } from './start/ChoosingAKind';
import { FirstGlobe } from './start/FirstGlobe';
import { Installation } from './start/Installation';
import { Introduction } from './start/Introduction';
import { StoryEngine } from './story/Engine';
import { StudioOverview } from './studio/StudioOverview';
import { StudioExport, StudioPresets, StudioShortcuts } from './studio/StudioPages';

export type DocPageComponent = ComponentType<DocLocation>;

/**
 * Slug → page component. Pages missing here render the generic skeleton,
 * so the whole manifest is reachable before the content exists.
 */
const PAGES: Readonly<Record<string, DocPageComponent>> = {
  'start/introduction': Introduction,
  'start/installation': Installation,
  'start/first-globe': FirstGlobe,
  'start/choosing-a-kind': ChoosingAKind,
  'kinds/overview': KindsOverview,
  'kinds/cinematic': KindPage,
  'kinds/outline': KindPage,
  'kinds/dotted': KindPage,
  'kinds/wireframe': KindPage,
  'kinds/hologram': KindPage,
  'kinds/paper': KindPage,
  'appearance/themes': Themes,
  'appearance/tokens': Tokens,
  'appearance/atmosphere': Atmosphere,
  'appearance/countries': Countries,
  'appearance/postprocessing': Postprocessing,
  'camera/position': Position,
  'camera/auto-rotate': AutoRotate,
  'camera/fly-to': FlyTo,
  'camera/zoom': Zoom,
  'data/country-data': CountryData,
  'data/markers': Markers,
  'data/arcs': Arcs,
  'data/labels': Labels,
  'data/legends': Legends,
  'data/data-layers': DataLayers,
  'interaction/events': EventsGuide,
  'interaction/selection': Selection,
  'interaction/projection': Projection,
  'story/engine': StoryEngine,
  'performance/overview': PerformanceOverview,
  'performance/pausing': Pausing,
  'performance/timing': Timing,
  'api/create-globe': CreateGlobe,
  'api/globe-config': GlobeConfigPage,
  'api/globe-instance': GlobeInstancePage,
  'api/events': EventsPage,
  'api/markers-and-arcs': TypesPage,
  'api/story-types': TypesPage,
  'api/scales': TypesPage,
  'api/theme-types': TypesPage,
  'api/easing': EasingPage,
  'api/country-ids': CountryIdsPage,
  'api/presets': PresetsPage,
  'frameworks/vanilla': FrameworkPage,
  'frameworks/react': FrameworkPage,
  'frameworks/vue': FrameworkPage,
  'frameworks/angular': FrameworkPage,
  'frameworks/ssr': SsrPage,
  'frameworks/bundlers': BundlersPage,
  'studio/overview': StudioOverview,
  'studio/export': StudioExport,
  'studio/presets': StudioPresets,
  'studio/shortcuts': StudioShortcuts,
};

export const resolvePage = (slug: string): DocPageComponent => PAGES[slug] ?? SkeletonPage;

export const hasDedicatedPage = (slug: string): boolean => slug in PAGES;

export const DEDICATED_SLUGS: ReadonlyArray<string> = Object.keys(PAGES);
