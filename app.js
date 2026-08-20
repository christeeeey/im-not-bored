// ============================================================
// tea house — app entry point
//
// Minimal hash router. Each page module renders itself into the
// shared #page-outlet element and optionally returns a cleanup
// function that runs before the next page renders.
// ============================================================

import { setActiveNav } from './nav.js';
import { renderPourPage } from './pour.js';
import { renderBrowsePage } from './browse.js';
import { renderCollectionPage } from './collection.js';

const outlet = document.getElementById('page-outlet');
const announcer = document.getElementById('sr-announcer');

const ROUTES = {
  pour: { render: renderPourPage, label: 'Pour' },
  browse: { render: renderBrowsePage, label: 'Browse' },
  collection: { render: renderCollectionPage, label: 'Collection' },
};

let currentCleanup = null;

function currentRoute() {
  const hash = (window.location.hash || '').replace('#', '');
  return ROUTES[hash] ? hash : 'pour';
}

function navigate() {
  const route = currentRoute();
  const page = ROUTES[route];

  if (typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  currentCleanup = page.render(outlet) || null;

  setActiveNav(route);
  outlet.focus({ preventScroll: true });
  announcer.textContent = `${page.label} page`;
}

window.addEventListener('hashchange', navigate);

if (!window.location.hash) {
  window.location.hash = '#pour';
} else {
  navigate();
}
