import { useEffect } from 'react';

import { Nav } from '@/components/home/Nav';
import { ClickSpark } from '@/components/reactbits';
import { NoiseOverlay, ScrollProgress } from '@/components/shared';

import { ApiSection } from './ApiSection';
import { DataStorySection } from './DataStorySection';
import { FinalCta } from './FinalCta';
import { HeroStage } from './HeroStage';
import { KindPersonalitiesSection } from './KindPersonalitiesSection';
import { LayerAnatomySection } from './LayerAnatomySection';
import { StudioWorkflowSection } from './StudioWorkflowSection';

export function HomeLanding() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <ClickSpark sparkColor="#ffd57a" sparkSize={8} sparkRadius={22} sparkCount={12} duration={520}>
      <main className="relative min-h-screen overflow-x-clip bg-[#02030a] text-slate-100 antialiased">
        <ScrollProgress />
        <NoiseOverlay />
        <Nav />
        <HeroStage />
        <KindPersonalitiesSection />
        <LayerAnatomySection />
        <StudioWorkflowSection />
        <DataStorySection />
        <ApiSection />
        <FinalCta />
      </main>
    </ClickSpark>
  );
}
