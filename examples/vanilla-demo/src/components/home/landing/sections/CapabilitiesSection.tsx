import { Link } from 'react-router-dom';
import { KIND_DATA_LAYER_SUPPORT } from '@/docs/kind-support';
import './capabilities.css';

const LAYERS = [
  { id: 'choropleth', title: 'Country colors', description: 'Put a value on each country. Let a color scale reveal the differences.', anchor: 'type-ChoroplethDataLayer' },
  { id: 'bars', title: 'Bars', description: 'Raise values above a coordinate or a country centroid. Make magnitude visible.', anchor: 'type-BarsDataLayer' },
  { id: 'extruded', title: 'Country extrusions', description: 'Give countries height and side walls, shaped by the values in your dataset.', anchor: 'type-ExtrudedDataLayer' },
  { id: 'heatmap', title: 'Heatmaps', description: 'Turn point samples into a density surface with color, height and contours.', anchor: 'type-HeatmapDataLayer' },
  { id: 'hexbin', title: 'Geodesic bins', description: 'Aggregate samples into triangular cells. Compare counts, totals or averages.', anchor: 'type-HexBinDataLayer' },
  { id: 'charts', title: 'Charts on the globe', description: 'Place grouped bars, pies, donuts, gauges and other series charts where the data belongs.', anchor: 'type-ChartsDataLayer' },
] as const;

const CONNECTIONS = [
  {
    title: 'Camera flights & stories',
    description: 'Fly to coordinates, frame a country, or compose scenes. Control duration, easing and elevation; keep your page’s captions in sync with scene events.',
    href: '/docs/camera/fly-to', link: 'Camera and flights',
  },
  {
    title: 'Country selection & HTML overlays',
    description: 'Connect country events to your interface and anchor HTML to coordinates. Five styles support country picking; Wireframe offers a programmatic selection ring.',
    href: '/docs/interaction/selection', link: 'Selection and interaction',
  },
  {
    title: 'Markers & animated routes',
    description: 'Label locations, pulse markers, and join coordinates with animated arcs. Markers, HTML markers and routes work across every globe style.',
    href: '/docs/data/arcs', link: 'Markers and routes',
  },
  {
    title: 'WebGL & the frame budget',
    description: 'Share one frame scheduler across globes. Cap frame rates, adapt pixel ratio to rendering speed, and automatically pause off-screen or hidden-tab globes.',
    href: '/docs/performance/overview', link: 'Rendering and performance',
  },
  {
    title: 'Typed API & framework components',
    description: 'Use JavaScript directly or React, Vue and Angular components. Configuration, events, camera controls and live data updates share the same typed engine.',
    href: '/docs/api/globe-instance', link: 'Explore the API',
  },
] as const;

const SCENARIOS = [
  {
    title: 'Compare countries.',
    description: 'Turn regional values into country colors. Add a matching legend and connect selection to a detail panel.',
    href: '/docs/recipes/choropleth-dashboard', label: 'Build a country dashboard',
  },
  {
    title: 'Connect your network.',
    description: 'Mark your hubs, trace their connections, and fly closer when someone selects a location.',
    href: '/docs/recipes/flight-routes', label: 'Build a route explorer',
  },
  {
    title: 'Tell a globe story.',
    description: 'Move between countries, highlight each chapter, and keep your narrative in sync with scene events.',
    href: '/docs/recipes/story-landing', label: 'Build a globe story',
  },
] as const;

export function CapabilitiesSection() {
  return (
    <section id="capabilities" className="home-capabilities" aria-labelledby="home-capabilities-heading">
      <div className="home-wrap">
        <header className="home-capabilities__intro">
          <h2 id="home-capabilities-heading">Make the world<br /> mean something.</h2>
          <p>The surface is just the beginning. Give your data a shape, your interface a sense of place, and your audience a reason to explore.</p>
        </header>

        <div className="home-capabilities__layers">
          <div className="home-capabilities__layers-heading">
            <h3>Six ways to shape your data.</h3>
            <Link to="/docs/data/data-layers" className="home-text-link">Data layer reference <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="home-capabilities__columns" aria-hidden="true"><span>Data layer</span><span>What it reveals</span><span>Available in</span></div>
          <dl className="home-capabilities__layer-list">
            {LAYERS.map((layer) => {
              const support = KIND_DATA_LAYER_SUPPORT.find((entry) => entry.label === layer.id);
              const kinds = Object.entries(support?.support ?? {})
                .filter(([, available]) => available === true)
                .map(([kind]) => kind.charAt(0).toUpperCase() + kind.slice(1));
              return <div key={layer.id}>
                <dt><Link to={`/docs/data/data-layers#${layer.anchor}`}>{layer.title}<span aria-hidden="true">↗</span></Link></dt>
                <dd>{layer.description}</dd>
                <dd className="home-capabilities__support"><span>Available in </span>{kinds.join(', ')}</dd>
              </div>;
            })}
          </dl>
          <p className="home-capabilities__layer-note">Choose one data layer at a time. Markers, arcs, HTML labels and the story engine have their own place in the scene.</p>
        </div>

        <div className="home-capabilities__connections">
          <h3>Built to be<br /> part of your app.</h3>
          <div className="home-capabilities__connection-list">
            {CONNECTIONS.map((connection, index) => <details key={connection.href} open={index === 0}>
              <summary>{connection.title}</summary>
              <div><p>{connection.description}</p><Link to={connection.href} className="home-text-link">{connection.link}<span aria-hidden="true">↗</span></Link></div>
            </details>)}
          </div>
        </div>

        <div className="home-scenarios" aria-labelledby="home-scenarios-heading">
          <div className="home-scenarios__intro">
            <h3 id="home-scenarios-heading">Start with a real use case.</h3>
            <p>Working recipes, live previews, and the code behind them.</p>
          </div>
          <div className="home-scenarios__list">
            {SCENARIOS.map((scenario) => <article key={scenario.href}>
              <h4><Link to={scenario.href}>{scenario.title}</Link></h4>
              <p>{scenario.description}</p>
              <Link to={scenario.href} className="home-scenarios__recipe-link">{scenario.label}<span aria-hidden="true">↗</span></Link>
            </article>)}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return <>
    <section id="faq" className="home-faq" aria-labelledby="home-faq-heading">
      <div className="home-wrap home-faq__layout">
        <div className="home-faq__intro"><h2 id="home-faq-heading">Before you<br /> start building.</h2><p>A few practical answers. The docs cover the rest.</p><Link to="/docs/start/introduction" className="home-text-link">Get to know Globio <span aria-hidden="true">↗</span></Link></div>
        <div className="home-faq__questions">
          <details><summary>Do I need a specific framework?</summary><div><p>No. The core works with JavaScript or TypeScript. React, Vue and Angular wrappers expose the same globe configuration and events through their component APIs. Mount the globe on the client when your application uses server rendering.</p><Link to="/docs/start/installation">Installation and requirements <span aria-hidden="true">↗</span></Link></div></details>
          <details><summary>Can I bring my own data?</summary><div><p>Yes. Provide coordinates for markers and routes, point samples for density layers, or values keyed by numeric country IDs. Update them through the API as your data changes. Globio renders the data you provide; your application handles fetching it.</p><Link to="/docs/data/data-layers">Choose a data shape <span aria-hidden="true">↗</span></Link></div></details>
          <details><summary>Does every style support every data layer?</summary><div><p>Outline supports all six types. Dotted supports country colors, bars, country extrusions and heatmaps. Cinematic supports country colors and heatmaps. Markers, arcs and HTML markers work across all six styles. Each globe has one data-layer slot.</p><Link to="/docs/kinds/overview">Compare globe styles <span aria-hidden="true">↗</span></Link></div></details>
          <details><summary>How do I keep a globe light on the page?</summary><div><p>Choose the geometry resolution and pixel ratio your view needs, cap the frame rate, and pause when hidden. Adaptive quality can lower the pixel ratio on slower frames. The browser and graphics device need WebGL support compatible with your installed three.js version.</p><Link to="/docs/performance/overview">Plan the rendering budget <span aria-hidden="true">↗</span></Link></div></details>
          <details><summary>What can I take out of Studio?</summary><div><p>Export the globe configuration as JSON for use in your application. You can also save your own themes and presets in the current browser. The docs show how that configuration becomes a mounted globe and how to add application behavior.</p><Link to="/docs/studio/export">Export and use the configuration <span aria-hidden="true">↗</span></Link></div></details>
        </div>
      </div>
    </section>
    <section className="home-closing" aria-labelledby="home-closing-heading">
      <div className="home-wrap home-closing__layout">
        <h2 id="home-closing-heading">Make something<br /> world-sized.</h2>
        <div><p>Pick a globe. Bring your data. Build the experience around it.</p><div className="home-closing__actions"><Link to="/studio" className="home-button home-button-accent">Make it in Studio <span aria-hidden="true">↗</span></Link><Link to="/docs/start/first-globe" className="home-text-link">Start with the code <span aria-hidden="true">→</span></Link></div></div>
      </div>
    </section>
  </>;
}
