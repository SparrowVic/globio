import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/sharp-solid-svg-icons';

const POINTS: ReadonlyArray<{ readonly title: string; readonly copy: string }> = [
  { title: 'Every knob, live', copy: 'Kind, theme, layers, data and the per-kind panels update the globe as you drag.' },
  { title: 'Presets and custom themes', copy: 'Start from a preset, override tokens, save your own. Everything stays in the browser.' },
  { title: 'Export what your app needs', copy: 'Copy the exact TypeScript or JSON config. What you see is what createGlobe gets.' },
  { title: 'A command palette', copy: 'Jump between panels, switch kinds and toggle layers from the keyboard.' },
];

export function StudioSection() {
  return (
    <section id="studio" className="relative py-28 md:py-36" aria-label="Studio">
      <div className="wrap">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
          <div>
            <span className="eyebrow reveal">/studio</span>
            <h2 className="t-h2 reveal reveal-d1 mt-5">Design it in Studio. Ship the config.</h2>
            <p className="t-lead reveal reveal-d2 mt-5 max-w-[30rem]">
              Studio is the same engine with every option exposed. Compose the globe you want, then
              hand the config to your app.
            </p>
            <ul className="reveal reveal-d3 mt-8 space-y-5">
              {POINTS.map((p) => (
                <li key={p.title} className="grid gap-1">
                  <span className="font-semibold text-[var(--ice)]">{p.title}</span>
                  <span className="t-body">{p.copy}</span>
                </li>
              ))}
            </ul>
            <Link to="/studio" className="btn btn-primary reveal reveal-d4 mt-9">
              Open Studio
              <FontAwesomeIcon icon={faArrowRight} className="size-3" />
            </Link>
          </div>
          <Link to="/studio" className="studio-frame reveal reveal-d2 block" aria-label="Open Studio">
            <img
              src="/studio-preview.jpg"
              alt="Globio Studio: the cinematic globe with its inspector panels"
              width={1600}
              height={1000}
              loading="lazy"
              decoding="async"
              className="block aspect-[16/10] w-full object-cover"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
