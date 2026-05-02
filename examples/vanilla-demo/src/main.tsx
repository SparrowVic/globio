import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';

document.documentElement.classList.add('dark');

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(<App />);
