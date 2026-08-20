// ============================================================
// tea house — Browse page
//
// Menu-style filtering: pick constraints, results update
// immediately, click a row to expand it inline.
// ============================================================

import { db, ENERGY_LEVELS, ENERGY_LABELS, MOODS, CATEGORIES } from './data.js';
import { filterActivities } from './filtering.js';

const TIME_OPTIONS = [
  { label: '2 min', value: 2 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '20 min', value: 20 },
  { label: '30+ min', value: null },
];

const CATEGORY_LABELS = {
  movement: 'move',
  create: 'create',
  creative: 'create',
  learn: 'learn',
  reflect: 'rest',
  organize: 'organize',
  outside: 'outside',
  reading: 'learn',
  connect: 'connect',
  other: 'other',
};

/** @param {HTMLElement} root */
export function renderBrowsePage(root) {
  /** @type {{maxMinutes: number|null, energy: string[], mood: string[], category: string[]}} */
  const state = {
    maxMinutes: null,
    energy: [],
    mood: [],
    category: [],
  };

  let expandedId = null;
  let unsubscribe = null;

  root.innerHTML = `
    <section class="browse-page">
      <p class="page-kicker">tea house</p>
      <h1 class="page-title">find something to do</h1>

      <div class="filter-groups">
        <div class="filter-group">
          <p class="section-heading">how much time do you have?</p>
          <div class="chip-row" data-group="time">
            ${TIME_OPTIONS.map((o) => `<button type="button" class="chip" data-value="${o.value ?? ''}">${o.label}</button>`).join('')}
          </div>
        </div>

        <div class="filter-group">
          <p class="section-heading">how much energy do you have?</p>
          <div class="chip-row" data-group="energy">
            ${ENERGY_LEVELS.map((e) => `<button type="button" class="chip" data-value="${e}">${ENERGY_LABELS[e]}</button>`).join('')}
          </div>
        </div>

        <div class="filter-group">
          <p class="section-heading">how are you feeling?</p>
          <div class="chip-row" data-group="mood">
            ${MOODS.map((m) => `<button type="button" class="chip" data-value="${m}">${m}</button>`).join('')}
          </div>
        </div>

        <div class="filter-group">
          <p class="section-heading">what sounds good?</p>
          <div class="chip-row" data-group="category">
            ${['movement', 'create', 'learn', 'reflect', 'organize', 'outside'].map((c) => `<button type="button" class="chip" data-value="${c}">${CATEGORY_LABELS[c]}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="browse-toolbar">
        <button type="button" class="text-action" data-action="clear-filters">clear filters</button>
        <span class="browse-count" aria-live="polite"></span>
      </div>

      <hr class="hairline" />

      <ul class="activity-rows" role="list"></ul>
      <p class="browse-empty" hidden>Nothing matches yet &mdash; try loosening a filter.</p>
    </section>
  `;

  const rowsEl = root.querySelector('.activity-rows');
  const emptyEl = root.querySelector('.browse-empty');
  const countEl = root.querySelector('.browse-count');

  root.querySelectorAll('.chip-row').forEach((group) => {
    const key = group.dataset.group;
    group.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (key === 'time') {
          const val = chip.dataset.value === '' ? null : Number(chip.dataset.value);
          const alreadySelected = state.maxMinutes === val && chip.classList.contains('selected');
          group.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
          if (alreadySelected) {
            state.maxMinutes = null;
          } else {
            state.maxMinutes = val;
            chip.classList.add('selected');
          }
        } else {
          const val = chip.dataset.value;
          const list = state[key];
          const idx = list.indexOf(val);
          if (idx >= 0) {
            list.splice(idx, 1);
            chip.classList.remove('selected');
          } else {
            list.push(val);
            chip.classList.add('selected');
          }
        }
        renderResults();
      });
    });
  });

  root.querySelector('[data-action="clear-filters"]').addEventListener('click', () => {
    state.maxMinutes = null;
    state.energy = [];
    state.mood = [];
    state.category = [];
    root.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
    renderResults();
  });

  function matchesCategoryFilter(activity) {
    if (!state.category.length) return true;
    return state.category.some((c) => {
      if (c === activity.category) return true;
      return CATEGORY_LABELS[activity.category] === c;
    });
  }

  function renderResults() {
    const base = filterActivities(db.getAll(), {
      maxMinutes: state.maxMinutes,
      energy: state.energy.length ? state.energy : null,
      mood: state.mood.length ? state.mood : null,
      location: null,
      onlyEnabled: true,
    });
    const results = base.filter(matchesCategoryFilter);

    countEl.textContent = results.length === 1 ? '1 activity' : `${results.length} activities`;

    if (!results.length) {
      rowsEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    rowsEl.innerHTML = results.map((a) => rowTemplate(a)).join('');

    rowsEl.querySelectorAll('.activity-row').forEach((rowEl) => {
      const id = rowEl.dataset.id;
      rowEl.querySelector('.row-summary').addEventListener('click', () => {
        expandedId = expandedId === id ? null : id;
        renderResults();
      });
    });
  }

  function rowTemplate(a) {
    const expanded = expandedId === a.id;
    return `
      <li class="activity-row ${expanded ? 'expanded' : ''}" data-id="${a.id}">
        <button type="button" class="row-summary" aria-expanded="${expanded}">
          <span class="row-name">${escapeHtml(a.name.toLowerCase())}${a.favorite ? ' <span class="row-fav" aria-label="favorite">\u2605</span>' : ''}</span>
          <span class="row-time">${escapeHtml(a.displayTime)}</span>
          <span class="row-meta">${escapeHtml(a.category)} \u00b7 ${escapeHtml(ENERGY_LABELS[a.energy] || a.energy)} energy</span>
        </button>
        ${expanded ? `
          <div class="row-detail">
            <p class="row-description">${escapeHtml(a.description)}</p>
            <div class="row-facts">
              <span><strong>time</strong> ${escapeHtml(a.displayTime)}</span>
              <span><strong>energy</strong> ${escapeHtml(ENERGY_LABELS[a.energy] || a.energy)}</span>
              <span><strong>mood</strong> ${escapeHtml(a.mood || '\u2014')}</span>
              <span><strong>location</strong> ${escapeHtml(a.location)}</span>
              <span><strong>equipment</strong> ${escapeHtml(a.equipment || 'none')}</span>
            </div>
            ${a.instructions && a.instructions.length ? `
              <p class="section-heading">how</p>
              <ol>${a.instructions.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
            ` : ''}
          </div>
        ` : ''}
      </li>
    `;
  }

  renderResults();
  unsubscribe = db.subscribe(renderResults);

  return () => { if (unsubscribe) unsubscribe(); };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
