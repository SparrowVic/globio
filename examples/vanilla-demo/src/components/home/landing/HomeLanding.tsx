import { useEffect, useRef } from 'react';

import { Nav } from '@/components/home/Nav';
import './landing.css';
import { useReveal } from './hooks/use-reveal';
import { PlanetStage } from './stage/PlanetStage';
import { DataSection, Footer, FrameworksSection, PerformanceSection, StudioSection } from './sections';

export function HomeLanding() {
  const rootRef = useRef<HTMLElement | null>(null);
  useReveal(rootRef);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <main ref={rootRef} className="landing relative min-h-screen overflow-x-clip">
      <Nav />
      <PlanetStage />
      <DataSection />
      <FrameworksSection />
      <PerformanceSection />
      <StudioSection />
      <Footer />
    </main>
  );
}
