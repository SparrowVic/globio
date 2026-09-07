import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '@/components/home/Nav';
import { Wordmark } from './atoms/Wordmark';
import { GITHUB_URL } from './data/links';
import { ShowcaseHero } from './stage/ShowcaseHero';
import { ExperienceSection } from './sections/ExperienceSection';
import { BuildSection } from './sections/BuildSection';
import { WorkspaceSection } from './sections/WorkspaceSection';
import './home.css';

export function HomeLanding() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Globio · Put a world in their hands';
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { root.style.scrollBehavior = media.matches ? 'auto' : 'smooth'; };
    update();
    media.addEventListener('change', update);
    return () => {
      document.title = previousTitle;
      root.style.scrollBehavior = previous;
      media.removeEventListener('change', update);
    };
  }, []);
  return (
    <div className="home-page">
      <a href="#home-content" className="home-skip">Skip to content</a>
      <Nav />
      <main id="home-content">
        <ShowcaseHero />
        <ExperienceSection />
        <BuildSection />
        <WorkspaceSection />
      </main>
      <footer className="home-footer home-wrap">
        <Link to="/" aria-label="Globio home"><Wordmark /></Link>
        <p>A little planet. A lot to explore.</p>
        <nav aria-label="Footer">
          <Link to="/docs">Documentation</Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub ↗</a>
          <span>MIT licensed</span>
        </nav>
      </footer>
    </div>
  );
}
