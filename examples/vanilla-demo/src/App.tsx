import { Component, lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';

// Each route loads its own interface. Opening a Studio link should not
// download the landing gallery, animations, and data playground first.
const Home = lazy(() => import('./routes/Home'));
const Studio = lazy(() => import('./routes/Studio'));
const Docs = lazy(() => import('./routes/Docs'));

class RouteErrorBoundary extends Component<{ readonly children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  override render() {
    if (!this.state.failed) return this.props.children;
    return <main className="grid min-h-screen place-items-center bg-[#050608] p-6 text-slate-100">
      <section className="w-full max-w-md rounded-lg border border-white/15 bg-[#090b10] p-6" role="alert">
        <h1 className="text-xl font-medium">This page could not load.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Check your connection and reload the page to try again.</p>
        <div className="mt-5 flex items-center gap-5">
          <button type="button" onClick={() => window.location.reload()} className="rounded-md border border-white/25 px-3 py-2 text-sm hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Reload page</button>
          <Link to="/" className="text-sm underline underline-offset-4">Back to home</Link>
        </div>
      </section>
    </main>;
  }
}

function RouteContent() {
  const { pathname } = useLocation();
  return <RouteErrorBoundary key={pathname}>
    <Suspense fallback={<div className="min-h-screen bg-[#050608]" role="status" aria-label="Loading page" aria-busy="true" />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/docs/*" element={<Docs />} />
        <Route path="/studio" element={<Studio />} />
      </Routes>
    </Suspense>
  </RouteErrorBoundary>;
}

/**
 * Top-level routing: `/` shows the marketing / showcase home page,
 * `/studio` (and aliases `/heatmap.html` etc. via legacy redirects)
 * loads the full configurator, `/docs/*` the documentation. The Vite dev server's SPA fallback
 * handles deep links during development.
 */
export default function App() {
  return (
    <BrowserRouter>
      <RouteContent />
    </BrowserRouter>
  );
}
