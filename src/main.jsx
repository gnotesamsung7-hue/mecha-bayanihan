// Snapshot the pristine page (before React renders) so "Download game" can save a working copy.
try { window.__PAGE_SNAPSHOT__ = '<!DOCTYPE html>\n' + document.documentElement.outerHTML; } catch { /* ignore */ }

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ICON_IMG } from './data.js';

for (const rel of ['icon', 'apple-touch-icon']) {
  const l = document.createElement('link'); l.rel = rel; l.href = ICON_IMG; document.head.appendChild(l);
}

createRoot(document.getElementById('root')).render(<App />);
