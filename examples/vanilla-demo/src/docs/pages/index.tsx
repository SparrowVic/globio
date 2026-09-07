import type { ComponentType } from 'react';
import type { DocLocation } from '@/docs/manifest';
import { Themes } from './appearance/Themes';
import { Tokens } from './appearance/Tokens';
import { CreateGlobe } from './api/CreateGlobe';
import { GlobeInstancePage } from './api/GlobeInstance';
import { FlyTo } from './camera/FlyTo';
import { CountryData } from './data/CountryData';
import { Markers } from './data/Markers';
import { FrameworkPage } from './frameworks/FrameworkPage';
import { Events } from './interaction/Events';
import { KindPage } from './kinds/KindPage';
import { KindsOverview } from './kinds/KindsOverview';
import { SkeletonPage } from './SkeletonPage';
import { ChoosingAKind } from './start/ChoosingAKind';
import { FirstGlobe } from './start/FirstGlobe';
import { Installation } from './start/Installation';
import { Introduction } from './start/Introduction';
import { StudioOverview } from './studio/StudioOverview';

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
  'camera/fly-to': FlyTo,
  'data/country-data': CountryData,
  'data/markers': Markers,
  'interaction/events': Events,
  'api/create-globe': CreateGlobe,
  'api/globe-instance': GlobeInstancePage,
  'frameworks/vanilla': FrameworkPage,
  'frameworks/react': FrameworkPage,
  'frameworks/vue': FrameworkPage,
  'frameworks/angular': FrameworkPage,
  'studio/overview': StudioOverview,
};

export const resolvePage = (slug: string): DocPageComponent => PAGES[slug] ?? SkeletonPage;

export const hasDedicatedPage = (slug: string): boolean => slug in PAGES;
