import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { Wordmark } from './landing/atoms/Wordmark';
import { GITHUB_URL } from './landing/data/links';

const ITEMS = [
  { label: 'Styles', href: '#kinds' },
  { label: 'What you can build', href: '#data' },
  { label: 'Developers', href: '#frameworks' },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  return (
    <header ref={header} className="home-nav" onKeyDown={(event) => {
      if (event.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); }
    }}>
      <div className="home-wrap home-nav-inner">
        <Link to="/" aria-label="Globio home" className="home-logo"><Wordmark /></Link>
        <nav aria-label="Primary" className="home-nav-links">
          {ITEMS.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          <Link to="/docs">Docs</Link>
        </nav>
        <div className="home-nav-actions">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="Globio on GitHub" className="home-github"><FontAwesomeIcon icon={faGithub} /></a>
          <Link to="/studio" className="home-button home-nav-studio">Open Studio <span aria-hidden="true">↗</span></Link>
          <button ref={toggle} type="button" className="home-menu-toggle" aria-expanded={open} aria-controls="home-mobile-nav" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
        </div>
      </div>
      {open && <nav id="home-mobile-nav" aria-label="Mobile navigation" className="home-mobile-nav">
        {ITEMS.map((item) => <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>)}
        <Link to="/docs" onClick={() => setOpen(false)}>Documentation</Link>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>GitHub ↗</a>
      </nav>}
    </header>
  );
}
