import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/sharp-solid-svg-icons';
import { CopyCommand } from '../atoms';
import { INSTALL_COMMAND } from '../data/links';

const PROOF: ReadonlyArray<string> = [
  'six kinds',
  'thirteen themes',
  'typed config',
  'React · Vue · Angular',
  'three.js is the only peer',
];

export function HeroCopy() {
  return (
    <div className="hero-seq flex flex-col items-center">
      <CopyCommand command={INSTALL_COMMAND} size="sm" />
      <h1 className="t-display mt-7 max-w-[14ch]">Put a planet in your product.</h1>
      <p className="t-lead mt-6 max-w-[40rem]">
        Globio renders interactive 3D globes from one typed config. Six visual kinds, data layers, a
        story engine, and wrappers for React, Vue and Angular.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/studio" className="btn btn-primary">
          Open Studio
          <FontAwesomeIcon icon={faArrowRight} className="size-3" />
        </Link>
        <Link to="/docs" className="btn btn-ghost">
          Read the docs
        </Link>
      </div>
      <ul className="t-mono mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[var(--mist)]">
        {PROOF.map((item, i) => (
          <li key={item} className="inline-flex items-center gap-3">
            {i > 0 && <span aria-hidden="true" className="size-[3px] rounded-full bg-[var(--mist)]/60" />}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
