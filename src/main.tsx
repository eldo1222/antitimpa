// Ensure window.fetch setter compatibility in sandboxed iFrames
try {
  if (typeof window !== 'undefined' && window.fetch) {
    const orig = window.fetch.bind(window);
    let active = orig;
    try {
      Object.defineProperty(window, 'fetch', {
        get: () => active || orig,
        set: (fn) => { if (typeof fn === 'function') active = fn; },
        configurable: true,
        enumerable: true
      });
    } catch (_) {}
  }
} catch (_) {}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
