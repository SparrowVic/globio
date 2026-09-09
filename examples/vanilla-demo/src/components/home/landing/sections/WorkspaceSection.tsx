import { Link } from 'react-router-dom';
import './capabilities.css';

export function WorkspaceSection() {
  return (
    <section id="studio" className="home-studio-showcase" aria-labelledby="home-workspace-heading">
      <div className="home-wrap">
        <div className="home-studio-showcase__intro">
          <h2 id="home-workspace-heading">Your globe.<br /> Every detail.</h2>
          <div className="home-studio-showcase__copy">
            <p>From the first spark to the final frame. Shape the atmosphere, tune the light, and bring your data into the scene. Every change, right in front of you.</p>
            <div className="home-studio-showcase__actions">
              <Link className="home-button home-button-accent" to="/studio">Enter Studio <span aria-hidden="true">↗</span></Link>
              <Link className="home-text-link" to="/docs/studio/overview">How Studio works <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </div>
      </div>
      <figure className="home-studio-showcase__preview">
        <Link className="home-studio-showcase__image-link" to="/studio?kind=cinematic&theme=cinematic-night&layer=none" aria-label="Open Cinematic Night in Studio">
          <img
            src="/studio-preview.jpg"
            alt="Globio Studio showing a Cinematic globe beside the scene controls and arc inspector."
            width={1600}
            height={1000}
            loading="lazy"
            decoding="async"
          />
        </Link>
        <figcaption className="home-wrap">
          <span>Cinematic in Studio</span>
          <span>The real workspace. Open it and make a change.</span>
        </figcaption>
      </figure>
      <div className="home-wrap">
        <ol className="home-studio-showcase__steps">
          <li><h3>Find your starting point.</h3><p>Explore six globe styles, switch themes, and try built-in presets. Save your own themes and presets in this browser.</p></li>
          <li><h3>Shape what people see.</h3><p>Adjust the camera, atmosphere and lighting. Tune markers and arcs, then explore the data layers available for your chosen style.</p></li>
          <li><h3>Take it into your app.</h3><p>Export your configuration as JSON. Use the same settings with the core API or a React, Vue or Angular component.</p></li>
        </ol>
      </div>
    </section>
  );
}
