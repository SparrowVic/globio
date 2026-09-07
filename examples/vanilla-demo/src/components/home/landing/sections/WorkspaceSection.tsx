import { Link } from 'react-router-dom';
import './build-sections.css';

export function WorkspaceSection() {
  return (
    <section id="studio" className="home-workspace" aria-labelledby="home-workspace-heading">
      <div className="home-wrap">
        <div className="home-workspace__intro">
          <h2 id="home-workspace-heading">Find your globe.<br />Make it yours.</h2>
          <div className="home-workspace__copy">
            <p>Explore the kinds. Shape the lighting. Add a layer of data. Studio gives you a place to try it all, then export the configuration for your app.</p>
            <div className="home-workspace__actions">
              <Link className="home-button" to="/studio">Open Studio <span aria-hidden="true">↗</span></Link>
              <Link className="home-text-link" to="/docs">Explore the docs</Link>
            </div>
          </div>
        </div>

        <figure className="home-workspace__preview">
          <Link className="home-workspace__image-link" to="/studio" aria-label="Explore this globe in Studio">
            <img
              src="/studio-preview.jpg"
              alt="Globio Studio showing a Cinematic globe beside the scene controls and arc inspector."
              width={1600}
              height={1000}
              loading="lazy"
              decoding="async"
            />
          </Link>
          <figcaption>
            <span>Cinematic in Studio</span>
            <span>Explore presets. Save your own. Export your config.</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
