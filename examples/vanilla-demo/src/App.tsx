import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Home from './routes/Home';
import Studio from './routes/Studio';

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
        <Route path="/studio" element={<Studio />} />
      </Routes>
    </BrowserRouter>
  );
}
