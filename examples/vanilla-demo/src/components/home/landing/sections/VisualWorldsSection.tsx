import { Link } from 'react-router-dom';
import type { GlobeKind } from '@your-globe/core';
import './visual-worlds.css';

interface WorldStudy {
  readonly kind: GlobeKind;
  readonly name: string;
  readonly character: string;
  readonly description: string;
  readonly uses: string;
  readonly imageDescription: string;
}

const WORLDS = {
  cinematic: {
    kind: 'cinematic',
    name: 'Cinematic',
    character: 'Film',
    description: 'Clouds cast shadows. Cities light the night. Sunlight catches the atmosphere. Build a procedural Earth, or bring your own textures for the surface, clouds and night lights.',
    uses: 'Product reveals · Earth stories · Global brands',
    imageDescription: 'Cinematic Earth with a brilliant blue atmosphere, drifting clouds and golden city lights on the night side.',
  },
  dotted: {
    kind: 'dotted',
    name: 'Dotted',
    character: 'Signal',
    description: 'Continents become fields of light. Hover lifts the dots; clicks send ripples across them. Add markers and routes, or place a choropleth beneath the point field.',
    uses: 'Global presence · Networks · Technology launches',
    imageDescription: 'North and South America formed from dense fields of luminous cyan dots against a black globe.',
  },
  hologram: {
    kind: 'hologram',
    name: 'Hologram',
    character: 'Projection',
    description: 'A luminous shell with scanning bands, bright borders and a shifting rim. Tune the noise, shimmer and glitches, then use country interaction to bring the projection into the experience.',
    uses: 'Interactive exhibits · Science fiction · Game interfaces',
    imageDescription: 'A cyan holographic globe with luminous country borders and horizontal scanlines across its translucent surface.',
  },
  paper: {
    kind: 'paper',
    name: 'Paper',
    character: 'Atlas',
    description: 'Rough ink borders and pastel land on a textured surface. Add country labels, a compass rose and your own story to give the globe the character of an illustrated atlas.',
    uses: 'Education · Museums · Travel stories',
    imageDescription: 'An illustrated atlas with sage oceans, pastel countries, fine ink borders and a compass rose over the Atlantic.',
  },
  outline: {
    kind: 'outline',
    name: 'Outline',
    character: 'Clarity',
    description: 'Crisp borders leave room for the data. The full set of data layers is available here: choropleth, bars, extruded countries, heatmap, hexbin and charts.',
    uses: 'Analytics · Country comparisons · Data journalism',
    imageDescription: 'A deep blue globe with crisp country outlines and a subtle blue atmosphere.',
  },
  wireframe: {
    kind: 'wireframe',
    name: 'Wireframe',
    character: 'Structure',
    description: 'Strip the surface back to latitude and longitude. Pulses, moving packets and pole streams animate the grid. Add your own markers and arcs to trace connections through it.',
    uses: 'Network views · Retro interfaces · Abstract worlds',
    imageDescription: 'A dark globe made from thin cyan latitude and longitude lines, surrounded by a luminous rim.',
  },
} satisfies Record<GlobeKind, WorldStudy>;

function WorldStudy({ world, featured = false }: { readonly world: WorldStudy; readonly featured?: boolean }) {
  const headingId = `home-worlds-${world.kind}`;
  return (
    <article className={`home-worlds__study home-worlds__study--${world.kind}${featured ? ' home-worlds__study--featured' : ''}`}>
      <Link className="home-worlds__study-link" to={`/docs/kinds/${world.kind}`} aria-labelledby={headingId}>
        <div className="home-worlds__art">
          <img
            src={`/home/world-${world.kind}.webp`}
            alt={world.imageDescription}
            width={1200}
            height={1200}
            loading="lazy"
            decoding="async"
          />
          <span className="home-worlds__image-action" aria-hidden="true">Explore {world.name} <span>↗</span></span>
        </div>
        <div className="home-worlds__study-copy">
          <div className="home-worlds__study-title">
            <h3 id={headingId}>{world.name}</h3>
            <span className="home-worlds__character">{world.character}</span>
          </div>
          <p className="home-worlds__description">{world.description}</p>
          {featured && (
            <ul className="home-worlds__features" aria-label="Cinematic features">
              <li>Fixed, real-time or orbiting sunlight</li>
              <li>Cloud shadows and atmospheric scattering</li>
              <li>City lights, route networks and aurora</li>
            </ul>
          )}
          <p className="home-worlds__uses">{world.uses}</p>
        </div>
      </Link>
    </article>
  );
}

export function VisualWorldsSection() {
  return (
    <section id="worlds" className="home-worlds" aria-labelledby="home-worlds-heading">
      <div className="home-wrap">
        <header className="home-worlds__intro">
          <h2 id="home-worlds-heading">One planet.<br /> Six different worlds<span>.</span></h2>
          <p>Light it like a film. Draw it in ink. Turn it into a field of signals. Each kind has its own materials, movement and character.</p>
        </header>

        <WorldStudy world={WORLDS.cinematic} featured />

        <div className="home-worlds__signals">
          <WorldStudy world={WORLDS.dotted} />
          <WorldStudy world={WORLDS.hologram} />
        </div>

        <p className="home-worlds__rail-hint">Three more perspectives <span>Swipe to explore <span aria-hidden="true">→</span></span></p>
        <div className="home-worlds__perspectives" aria-label="Paper, Outline and Wireframe styles">
          <WorldStudy world={WORLDS.paper} />
          <WorldStudy world={WORLDS.outline} />
          <WorldStudy world={WORLDS.wireframe} />
        </div>

        <div className="home-worlds__next">
          <p>Choose the character.<br /> <strong>Then make it your world.</strong></p>
          <Link className="home-button-secondary" to="/studio">Try the kinds in Studio <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>
  );
}
