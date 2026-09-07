import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Home from './routes/Home';

// Studio carries the whole configurator (panels, command palette, modals);
// splitting it keeps the landing's first load to the engine and the page.
const Studio = lazy(() => import('./routes/Studio'));

/**
 * Top-level routing: `/` shows the marketing / showcase home page,
 * `/studio` (and aliases `/heatmap.html` etc. via legacy redirects)
 * loads the full configurator. The Vite dev server's SPA fallback
 * handles deep links during development.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/studio"
          element={
            <Suspense fallback={<div className="min-h-screen bg-[#050608]" aria-busy="true" />}>
              <Studio />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
