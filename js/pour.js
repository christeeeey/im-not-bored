// ============================================================
// tea house — Pour page
//
// The visual centerpiece: a teapot pours into a cup, an activity
// is chosen while the cup fills, and the cup rotates from a side
// view into a top-down view to reveal the result.
// ============================================================

import { db } from './data.js';
import { filterActivities, pickRandom } from './filtering.js';

const POUR_FILTERS = [
  { id: 'any', label: 'anything', filters: {} },
  { id: 'time5', label: '\u2264 5 min', filters: { maxMinutes: 5 } },
  { id: 'time10', label: '\u2264 10 min', filters: { maxMinutes: 10 } },
  { id: 'low-energy', label: 'low energy', filters: { energy: ['very-low', 'low'] } },
  { id: 'creative', label: 'creative', filters: { category: ['creative', 'create'] } },
  { id: 'movement', label: 'movement', filters: { category: ['movement'] } },
];

const TEAPOT_SVG = `
<svg class="teapot-svg" viewBox="0 0 260 190" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path class="teapot-line" d="M62 78 C60 58 82 44 118 44 C154 44 176 58 176 80 C176 82 176 84 175 86
    C196 84 214 76 226 62 C220 84 204 100 179 106
    C176 132 152 150 118 150 C82 150 58 130 58 100 C58 92 59 85 62 78 Z" />
  <path class="teapot-line" d="M96 44 C98 34 108 28 118 28 C128 28 137 34 139 44" />
  <circle class="teapot-line" cx="118" cy="24" r="5" />
  <path class="teapot-line" d="M60 92 C40 92 30 104 30 116 C30 128 40 138 58 136" />
</svg>`;

const TEACUP_SIDE_SVG = `
<svg class="teacup-side" viewBox="0 0 200 190" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse class="teapot-line" cx="100" cy="168" rx="72" ry="12" />
  <path class="teapot-line cup-outline" d="M50 78 L64 158 C66 168 82 175 100 175 C118 175 134 168 136 158 L150 78" />
  <ellipse class="teapot-line" cx="100" cy="78" rx="50" ry="12" />
  <path class="teapot-line" d="M148 92 C172 92 184 104 184 116 C184 128 172 140 150 138" />
  <defs>
    <clipPath id="cup-interior-clip">
      <path d="M54 82 L66 156 C68 165 83 171 100 171 C117 171 132 165 134 156 L146 82
               C146 90 126 96 100 96 C74 96 54 90 54 82 Z" />
    </clipPath>
  </defs>
  <rect class="tea-level" x="50" y="76" width="100" height="100" clip-path="url(#cup-interior-clip)" />
</svg>`;

const STREAM_SVG = `
<svg class="tea-stream" viewBox="0 0 60 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path class="stream-path" d="M8 4 C10 24 40 40 44 68 C46 78 40 86 32 86" />
</svg>`;

const STEAM_SVG = `
<svg class="tea-steam" viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path class="steam-path steam-1" d="M32 82 C24 66 42 58 34 42 C28 30 40 20 36 6" />
  <path class="steam-path steam-2" d="M58 82 C50 64 68 56 60 38 C54 26 66 16 62 2" />
  <path class="steam-path steam-3" d="M78 82 C72 68 86 60 80 46 C76 36 86 28 82 16" />
</svg>`;

/**
 * @param {HTMLElement} root
 */
export function renderPourPage(root) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let activeFilterId = 'any';
  let phase = 'idle'; // idle | pouring | result | completed
  let currentActivity = null;
  let pourTimers = [];

  root.innerHTML = `
    <section class="pour-page" aria-live="polite">
      <p class="page-kicker">tea house</p>

      <div class="pour-filters" role="group" aria-label="Narrow what pour can choose">
        ${POUR_FILTERS.map((f) => `
          <button type="button" class="chip ${f.id === 'any' ? 'selected' : ''}" data-filter-id="${f.id}">${f.label}</button>
        `).join('')}
      </div>

      <div class="pour-scene" data-phase="idle">
        <div class="teapot-wrap">
          ${TEAPOT_SVG}
          <button type="button" class="pour-word" aria-label="Pour a random activity">pour</button>
        </div>
        <div class="teacup-wrap">
          ${TEACUP_SIDE_SVG}
          ${STREAM_SVG}
          ${STEAM_SVG}
        </div>
      </div>

      <div class="pour-result" hidden>
        <div class="pour-result-head">
          <h2 class="result-name"></h2>
          <p class="result-meta"></p>
        </div>
        <div class="pour-actions">
          <button type="button" class="text-action primary" data-action="do-this">do this</button>
          <button type="button" class="text-action" data-action="pour-again">pour again</button>
        </div>
        <div class="result-detail">
          <p class="result-description"></p>
          <div class="result-instructions" hidden>
            <p class="section-heading">how</p>
            <ol></ol>
          </div>
        </div>
      </div>

      <div class="pour-completion" hidden>
        <p class="completion-text">enjoy your tea.</p>
        <button type="button" class="text-action" data-action="back-to-pour">pour something else</button>
      </div>

      <p class="pour-empty" hidden>No activities match that filter right now &mdash; try another, or add something to your collection.</p>
    </section>
  `;

  const scene = root.querySelector('.pour-scene');
  const pourWord = root.querySelector('.pour-word');
  const resultEl = root.querySelector('.pour-result');
  const completionEl = root.querySelector('.pour-completion');
  const emptyEl = root.querySelector('.pour-empty');
  const nameEl = root.querySelector('.result-name');
  const metaEl = root.querySelector('.result-meta');
  const descEl = root.querySelector('.result-description');
  const instructionsWrap = root.querySelector('.result-instructions');
  const instructionsList = root.querySelector('.result-instructions ol');
  const filterChips = root.querySelectorAll('.chip');

  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      if (phase === 'pouring') return;
      activeFilterId = chip.dataset.filterId;
      filterChips.forEach((c) => c.classList.toggle('selected', c === chip));
    });
  });

  pourWord.addEventListener('click', startPour);

  root.querySelector('[data-action="pour-again"]').addEventListener('click', startPour);
  root.querySelector('[data-action="do-this"]').addEventListener('click', doThis);
  root.querySelector('[data-action="back-to-pour"]').addEventListener('click', resetToIdle);

  function currentFilterDef() {
    return POUR_FILTERS.find((f) => f.id === activeFilterId) || POUR_FILTERS[0];
  }

  function clearTimers() {
    pourTimers.forEach((t) => clearTimeout(t));
    pourTimers = [];
  }

  function startPour() {
    if (phase === 'pouring') return;

    const pool = filterActivities(db.getAll(), currentFilterDef().filters);
    const chosen = pickRandom(pool);

    emptyEl.hidden = true;
    if (!chosen) {
      emptyEl.hidden = false;
      return;
    }

    currentActivity = chosen;
    phase = 'pouring';
    resultEl.hidden = true;
    completionEl.hidden = true;
    clearTimers();

    scene.dataset.phase = 'pouring';
    scene.classList.remove('is-filled', 'is-steaming');

    if (reduceMotion) {
      // Skip the large movement; do a quick fade straight to the result.
      const t = setTimeout(() => {
        scene.classList.add('is-filling', 'is-filled', 'is-steaming');
        showResult(chosen);
      }, 250);
      pourTimers.push(t);
      return;
    }

    scene.classList.add('is-pouring');

    const t1 = setTimeout(() => scene.classList.add('is-tilted'), 500);
    const t2 = setTimeout(() => scene.classList.add('is-streaming', 'is-filling'), 650);
    const t3 = setTimeout(() => scene.classList.remove('is-streaming'), 2500);
    const t4 = setTimeout(() => scene.classList.remove('is-pouring', 'is-tilted'), 2650);
    const t5 = setTimeout(() => scene.classList.add('is-steaming'), 2900);
    const t6 = setTimeout(() => showResult(chosen), 3300);

    pourTimers.push(t1, t2, t3, t4, t5, t6);
  }

  function showResult(activity) {
    phase = 'result';
    scene.dataset.phase = 'result';
    scene.classList.add('is-filled');

    nameEl.textContent = activity.name.toLowerCase();
    metaEl.textContent = `${activity.displayTime} \u00b7 ${activity.energy.replace('-', ' ')} energy \u00b7 ${activity.category}`;
    descEl.textContent = activity.description;

    if (activity.instructions && activity.instructions.length) {
      instructionsList.innerHTML = activity.instructions.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
      instructionsWrap.hidden = false;
    } else {
      instructionsWrap.hidden = true;
    }

    resultEl.hidden = false;
    resultEl.classList.remove('reveal');
    // force reflow so the reveal transition replays each time
    void resultEl.offsetWidth;
    resultEl.classList.add('reveal');
  }

  function doThis() {
    if (!currentActivity) return;
    db.markCompleted(currentActivity.id);
    resultEl.hidden = true;
    completionEl.hidden = false;
    phase = 'completed';
  }

  function resetToIdle() {
    phase = 'idle';
    currentActivity = null;
    clearTimers();
    scene.dataset.phase = 'idle';
    scene.classList.remove('is-pouring', 'is-tilted', 'is-streaming', 'is-filling', 'is-filled', 'is-steaming');
    resultEl.hidden = true;
    completionEl.hidden = true;
    emptyEl.hidden = true;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
