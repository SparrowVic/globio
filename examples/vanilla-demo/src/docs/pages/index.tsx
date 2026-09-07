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
import { ChoroplethDashboard, FlightRoutes, HeroGlobe, LiveFeed, RecipesOverview, StoryLanding } from './recipes/RecipePages';

export type DocPageComponent = ComponentType<DocLocation>;

/**
 * Slug → page component. Pages missing here render the generic skeleton,
 * so the whole manifest is reachable before the content exists.
 */
interface PageEntry {
  readonly component: DocPageComponent;
  /** Path under src/docs/pages, for the edit link. */
  readonly source: string;
}

const entry = (component: DocPageComponent, source: string): PageEntry => ({ component, source });

const PAGES: Readonly<Record<string, PageEntry>> = {
  'start/introduction': entry(Introduction, 'start/Introduction.tsx'),
  'start/installation': entry(Installation, 'start/Installation.tsx'),
  'start/first-globe': entry(FirstGlobe, 'start/FirstGlobe.tsx'),
  'start/choosing-a-kind': entry(ChoosingAKind, 'start/ChoosingAKind.tsx'),
  'kinds/overview': entry(KindsOverview, 'kinds/KindsOverview.tsx'),
  'kinds/cinematic': entry(KindPage, 'kinds/KindPage.tsx'),
  'kinds/outline': entry(KindPage, 'kinds/KindPage.tsx'),
  'kinds/dotted': entry(KindPage, 'kinds/KindPage.tsx'),
  'kinds/wireframe': entry(KindPage, 'kinds/KindPage.tsx'),
  'kinds/hologram': entry(KindPage, 'kinds/KindPage.tsx'),
  'kinds/paper': entry(KindPage, 'kinds/KindPage.tsx'),
  'appearance/themes': entry(Themes, 'appearance/Themes.tsx'),
  'appearance/tokens': entry(Tokens, 'appearance/Tokens.tsx'),
  'appearance/atmosphere': entry(Atmosphere, 'appearance/Atmosphere.tsx'),
  'appearance/countries': entry(Countries, 'appearance/Countries.tsx'),
  'appearance/postprocessing': entry(Postprocessing, 'appearance/Postprocessing.tsx'),
  'camera/position': entry(Position, 'camera/Position.tsx'),
  'camera/auto-rotate': entry(AutoRotate, 'camera/AutoRotate.tsx'),
  'camera/fly-to': entry(FlyTo, 'camera/FlyTo.tsx'),
  'camera/zoom': entry(Zoom, 'camera/Zoom.tsx'),
  'data/country-data': entry(CountryData, 'data/CountryData.tsx'),
  'data/markers': entry(Markers, 'data/Markers.tsx'),
  'data/arcs': entry(Arcs, 'data/Arcs.tsx'),
  'data/labels': entry(Labels, 'data/Labels.tsx'),
  'data/legends': entry(Legends, 'data/Legends.tsx'),
  'data/data-layers': entry(DataLayers, 'data/DataLayers.tsx'),
  'interaction/events': entry(EventsGuide, 'interaction/Events.tsx'),
  'interaction/selection': entry(Selection, 'interaction/Selection.tsx'),
  'interaction/projection': entry(Projection, 'interaction/Projection.tsx'),
  'story/engine': entry(StoryEngine, 'story/Engine.tsx'),
  'performance/overview': entry(PerformanceOverview, 'performance/Overview.tsx'),
  'performance/pausing': entry(Pausing, 'performance/Pausing.tsx'),
  'performance/timing': entry(Timing, 'performance/Timing.tsx'),
  'api/create-globe': entry(CreateGlobe, 'api/CreateGlobe.tsx'),
  'api/globe-config': entry(GlobeConfigPage, 'api/GlobeConfigPage.tsx'),
  'api/globe-instance': entry(GlobeInstancePage, 'api/GlobeInstance.tsx'),
  'api/events': entry(EventsPage, 'api/EventsPage.tsx'),
  'api/markers-and-arcs': entry(TypesPage, 'api/TypesPage.tsx'),
  'api/story-types': entry(TypesPage, 'api/TypesPage.tsx'),
  'api/scales': entry(TypesPage, 'api/TypesPage.tsx'),
  'api/theme-types': entry(TypesPage, 'api/TypesPage.tsx'),
  'api/easing': entry(EasingPage, 'api/Utilities.tsx'),
  'api/country-ids': entry(CountryIdsPage, 'api/Utilities.tsx'),
  'api/presets': entry(PresetsPage, 'api/Utilities.tsx'),
  'frameworks/vanilla': entry(FrameworkPage, 'frameworks/FrameworkPage.tsx'),
  'frameworks/react': entry(FrameworkPage, 'frameworks/FrameworkPage.tsx'),
  'frameworks/vue': entry(FrameworkPage, 'frameworks/FrameworkPage.tsx'),
  'frameworks/angular': entry(FrameworkPage, 'frameworks/FrameworkPage.tsx'),
  'frameworks/ssr': entry(SsrPage, 'frameworks/Guides.tsx'),
  'frameworks/bundlers': entry(BundlersPage, 'frameworks/Guides.tsx'),
  'studio/overview': entry(StudioOverview, 'studio/StudioOverview.tsx'),
  'studio/export': entry(StudioExport, 'studio/StudioPages.tsx'),
  'studio/presets': entry(StudioPresets, 'studio/StudioPages.tsx'),
  'studio/shortcuts': entry(StudioShortcuts, 'studio/StudioPages.tsx'),
  'recipes/overview': entry(RecipesOverview, 'recipes/RecipePages.tsx'),
  'recipes/choropleth-dashboard': entry(ChoroplethDashboard, 'recipes/RecipePages.tsx'),
  'recipes/flight-routes': entry(FlightRoutes, 'recipes/RecipePages.tsx'),
  'recipes/story-landing': entry(StoryLanding, 'recipes/RecipePages.tsx'),
  'recipes/hero-globe': entry(HeroGlobe, 'recipes/RecipePages.tsx'),
  'recipes/live-feed': entry(LiveFeed, 'recipes/RecipePages.tsx'),
};

export const resolvePage = (slug: string): DocPageComponent => PAGES[slug]?.component ?? SkeletonPage;

export const pageSource = (slug: string): string | undefined => PAGES[slug]?.source;

export const hasDedicatedPage = (slug: string): boolean => slug in PAGES;

export const DEDICATED_SLUGS: ReadonlyArray<string> = Object.keys(PAGES);
