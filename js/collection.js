// ============================================================
// tea house — Collection page
//
// Add, edit, delete, enable/disable, and favorite activities.
// Editing happens inline, expanded within the row itself.
// ============================================================

import { db, ENERGY_LEVELS, ENERGY_LABELS, MOODS, CATEGORIES, LOCATIONS } from './data.js';

/** @param {HTMLElement} root */
export function renderCollectionPage(root) {
  let expandedId = null;
  let showAddForm = false;
  let unsubscribe = null;

  root.innerHTML = `
    <section class="collection-page">
      <p class="page-kicker">tea house</p>
      <div class="collection-head">
        <h1 class="page-title">your collection</h1>
        <button type="button" class="text-action primary" data-action="toggle-add">+ add something</button>
      </div>

      <div class="add-form-wrap" hidden></div>

      <hr class="hairline" />

      <ul class="collection-rows" role="list"></ul>
      <p class="collection-empty" hidden>Your collection is empty. Add the first thing worth doing instead of scrolling.</p>
    </section>
  `;

  const addFormWrap = root.querySelector('.add-form-wrap');
  const rowsEl = root.querySelector('.collection-rows');
  const emptyEl = root.querySelector('.collection-empty');

  root.querySelector('[data-action="toggle-add"]').addEventListener('click', () => {
    showAddForm = !showAddForm;
    renderAddForm();
  });

  function renderAddForm() {
    addFormWrap.hidden = !showAddForm;
    if (!showAddForm) {
      addFormWrap.innerHTML = '';
      return;
    }
    addFormWrap.innerHTML = activityFormTemplate();
    wireForm(addFormWrap, null, () => {
      showAddForm = false;
      renderAddForm();
    });
  }

  function renderRows() {
    const items = db.getAll();

    if (!items.length) {
      rowsEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    rowsEl.innerHTML = items.map((a) => collectionRowTemplate(a, expandedId === a.id)).join('');

    rowsEl.querySelectorAll('.collection-row').forEach((rowEl) => {
      const id = rowEl.dataset.id;
      const activity = items.find((a) => a.id === id);

      const summary = rowEl.querySelector('.row-summary');
      const toggleExpand = () => {
        expandedId = expandedId === id ? null : id;
        renderRows();
      };
      summary.addEventListener('click', (e) => {
        if (e.target.closest('.row-icon-actions')) return;
        toggleExpand();
      });
      summary.addEventListener('keydown', (e) => {
        if (e.target.closest('.row-icon-actions')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleExpand();
        }
      });

      rowEl.querySelector('[data-action="favorite"]').addEventListener('click', (e) => {
        e.stopPropagation();
        db.toggleFavorite(id);
      });

      rowEl.querySelector('[data-action="enabled"]').addEventListener('click', (e) => {
        e.stopPropagation();
        db.toggleEnabled(id);
      });

      const editWrap = rowEl.querySelector('.row-edit-wrap');
      if (editWrap) {
        editWrap.innerHTML = activityFormTemplate(activity);
        wireForm(editWrap, activity, () => {
          expandedId = null;
          renderRows();
        });

        const deleteBtn = editWrap.querySelector('[data-action="delete"]');
        deleteBtn.addEventListener('click', () => {
          if (confirm(`Remove "${activity.name}" from your collection?`)) {
            db.remove(id);
          }
        });
      }
    });
  }

  function wireForm(container, existingActivity, onDone) {
    const form = container.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = readForm(form);
      if (!data.name.trim()) return;

      if (existingActivity) {
        db.update(existingActivity.id, data);
      } else {
        db.add(data);
      }
      onDone();
    });

    const cancelBtn = container.querySelector('[data-action="cancel"]');
    if (cancelBtn) cancelBtn.addEventListener('click', () => onDone());
  }

  function readForm(form) {
    const fd = new FormData(form);
    const instructionsRaw = String(fd.get('instructions') || '');
    return {
      name: String(fd.get('name') || ''),
      description: String(fd.get('description') || ''),
      displayTime: String(fd.get('displayTime') || ''),
      timeMinutes: Number(fd.get('timeMinutes') || 0),
      energy: String(fd.get('energy') || 'low'),
      category: String(fd.get('category') || 'other'),
      mood: String(fd.get('mood') || ''),
      location: String(fd.get('location') || 'anywhere'),
      equipment: String(fd.get('equipment') || 'none'),
      instructions: instructionsRaw.split('\n').map((s) => s.trim()).filter(Boolean),
      favorite: fd.get('favorite') === 'on',
      enabled: fd.get('enabled') === 'on',
    };
  }

  renderRows();
  unsubscribe = db.subscribe(renderRows);

  return () => { if (unsubscribe) unsubscribe(); };
}

function collectionRowTemplate(a, expanded) {
  return `
    <li class="collection-row ${expanded ? 'expanded' : ''} ${a.enabled ? '' : 'disabled-row'}" data-id="${a.id}">
      <div class="row-summary" role="button" tabindex="0" aria-expanded="${expanded}" aria-label="${escapeAttr(a.name)}, ${expanded ? 'collapse' : 'expand'} to edit">
        <span class="row-name">${escapeHtml(a.name.toLowerCase())}</span>
        <span class="row-meta">${escapeHtml(a.category)}</span>
        <span class="row-time">${escapeHtml(a.displayTime)}</span>
        <span class="row-icon-actions">
          <button type="button" class="icon-toggle ${a.favorite ? 'active' : ''}" data-action="favorite" aria-pressed="${a.favorite}" aria-label="Toggle favorite">\u2605</button>
          <button type="button" class="icon-toggle ${a.enabled ? 'active' : ''}" data-action="enabled" aria-pressed="${a.enabled}" aria-label="Toggle enabled">${a.enabled ? 'on' : 'off'}</button>
        </span>
      </div>
      ${expanded ? '<div class="row-edit-wrap"></div>' : ''}
    </li>
  `;
}

function activityFormTemplate(a = null) {
  const v = (field, fallback = '') => (a ? a[field] : fallback);
  return `
    <form class="activity-form">
      <div class="form-grid">
        <label class="field field-wide">
          <span>name</span>
          <input type="text" name="name" value="${escapeAttr(v('name'))}" required />
        </label>

        <label class="field field-wide">
          <span>description</span>
          <textarea name="description" rows="2">${escapeHtml(v('description'))}</textarea>
        </label>

        <label class="field">
          <span>display time</span>
          <input type="text" name="displayTime" value="${escapeAttr(v('displayTime'))}" placeholder="about 5 min" />
        </label>

        <label class="field">
          <span>time (minutes)</span>
          <input type="number" name="timeMinutes" min="0" value="${v('timeMinutes', 5)}" />
        </label>

        <label class="field">
          <span>energy</span>
          <select name="energy">
            ${ENERGY_LEVELS.map((e) => `<option value="${e}" ${v('energy', 'low') === e ? 'selected' : ''}>${ENERGY_LABELS[e]}</option>`).join('')}
          </select>
        </label>

        <label class="field">
          <span>category</span>
          <select name="category">
            ${CATEGORIES.map((c) => `<option value="${c}" ${v('category', 'other') === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>

        <label class="field">
          <span>mood</span>
          <select name="mood">
            <option value="">\u2014</option>
            ${MOODS.map((m) => `<option value="${m}" ${v('mood') === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </label>

        <label class="field">
          <span>location</span>
          <select name="location">
            ${LOCATIONS.map((l) => `<option value="${l}" ${v('location', 'anywhere') === l ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>

        <label class="field field-wide">
          <span>equipment</span>
          <input type="text" name="equipment" value="${escapeAttr(v('equipment', 'none'))}" />
        </label>

        <label class="field field-wide">
          <span>instructions <em>(one step per line)</em></span>
          <textarea name="instructions" rows="4">${(a && a.instructions ? a.instructions.join('\n') : '')}</textarea>
        </label>

        <label class="field field-inline">
          <input type="checkbox" name="favorite" ${v('favorite') ? 'checked' : ''} />
          <span>favorite</span>
        </label>

        <label class="field field-inline">
          <input type="checkbox" name="enabled" ${a ? (a.enabled ? 'checked' : '') : 'checked'} />
          <span>enabled</span>
        </label>
      </div>

      <div class="form-actions">
        <button type="submit" class="text-action primary">${a ? 'save changes' : 'add to collection'}</button>
        ${a ? '<button type="button" class="text-action" data-action="delete">delete</button>' : ''}
        <button type="button" class="text-action" data-action="cancel">cancel</button>
      </div>
    </form>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
