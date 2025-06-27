// js/main.js
import { fetchChallengeResults } from './data.js';

// --- Global state for data, sorting, and metadata ---
let originalData = [];
let sortCriteria = [];      // e.g. [{ key: 'category', dir: 'asc', type: 'field' }]
let challengeData = {};     // will hold the full response object
let routeIdMap = [];        // ordered list of all route IDs

document.addEventListener('DOMContentLoaded', async () => {
  const challengeId = 28; // or pull from URL/data-attribute
  try {
    const data = await fetchChallengeResults(challengeId);
    challengeData = data;
    originalData = Array.isArray(data.data) ? data.data : [];

    recalculatePlaces(originalData);
    updateHeader(data);
    updateStatus(data);
    renderTable(originalData);
    renderCategories(data.categories);
  } catch (err) {
    console.error(err);
    const statusEl = document.getElementById('challengeStatus');
    if (statusEl) statusEl.textContent = 'Помилка завантаження даних';
  }
});

// --- UI update helpers ---
function updateHeader(data) {
  document.getElementById('challengeTypeLabel').textContent = `OPRO – ${data.type}`;
  document.getElementById('challengeName').textContent      = data.name;
}

function updateStatus(data) {
  const el = document.getElementById('challengeStatus');
  if (!el) return;
  if (data.type === 'CHALLENGE') {
    const done = originalData.filter(r => r.completion).length;
    const max  = data.maxParticipants;
    el.textContent = (max > 0 && done >= max) ? 'Завершено' : `${done}/${max}`;
  } else {
    el.textContent = new Date(data.endDate) > new Date()
      ? 'Active'
      : 'Finished';
  }
}

function renderCategories(categories = []) {
  const ul = document.getElementById('categoryList');
  ul.innerHTML = '';
  categories.forEach(cat => {
    const li = document.createElement('li');
    li.textContent = `${cat.numberCategory} — ${cat.description}`;
    ul.appendChild(li);
  });
}

/**
 * Recalculate "place" inside each category group.
 */
function recalculatePlaces(rows) {
  const groups = {};
  rows.forEach(r => {
    if (r.place != null) {
      (groups[r.category] ||= []).push(r);
    }
  });
  Object.values(groups).forEach(group => {
    group.sort((a, b) => a.place - b.place)
         .forEach((r, i) => { r.place = i + 1; });
  });
}

// --- Sorting logic ---
function handleSort(key, type = 'field') {
  const idx = sortCriteria.findIndex(c => c.key === key);
  if (idx > -1) {
    // toggle direction
    sortCriteria[idx].dir = sortCriteria[idx].dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortCriteria.push({ key, dir: 'asc', type });
  }
  applySortAndRender();
}

function applySortAndRender() {
  const dataToSort = [...originalData];
  dataToSort.sort((a, b) => {
    for (const c of sortCriteria) {
      let vA = c.type === 'route'
               ? a.perRouteTime?.[c.key]
               : a[c.key];
      let vB = c.type === 'route'
               ? b.perRouteTime?.[c.key]
               : b[c.key];

      if (vA == null && vB != null) return 1;
      if (vA != null && vB == null) return -1;
      if (vA == null && vB == null) continue;

      const cmp = String(vA).localeCompare(String(vB), undefined, { numeric: true });
      if (cmp !== 0) return c.dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
  renderTable(dataToSort);
}

// --- Table rendering ---
function renderTable(rows) {
  const table     = document.getElementById('resultsTable');
  const theadRow  = document.getElementById('resultsTableHeader');
  const tbody     = table.querySelector('tbody');
  theadRow.innerHTML = '';
  tbody.innerHTML   = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="3">No results yet</td></tr>';
    return;
  }

  // Build static headers
  const hasPlace = originalData.some(r => r.place != null);
  const hasScore = originalData.some(r => r.score != null);
  const headers = [
    { title: 'Cat.¹',      key: 'category'   },
    { title: 'Athlete',    key: 'athleteName'},
    { title: 'Number²',    key: 'number'     },
    ...(hasPlace ? [{ title: 'Place³',  key: 'place' }]  : []),
    ...(hasScore ? [{ title: 'Score⁴', key: 'score' }]  : []),
    // only include Chance if type=CHALLENGE
    ...(challengeData.type === 'CHALLENGE'
      ? [{ title: 'Chance⁵', key: 'chance' }]
      : []),
    { title: 'Completion⁶', key: 'completion' },
    { title: 'Time⁷',       key: 'totalTime'  }
  ];

  // Determine full set of route IDs and map them to columns
  const idSet = new Set();
  originalData.forEach(r =>
    Object.keys(r.perRouteTime || {}).forEach(id => idSet.add(Number(id)))
  );
  routeIdMap = Array.from(idSet).sort((a, b) => a - b);

  // Ensure we have as many columns as backend's countRoutes
  const expected = typeof challengeData.countRoutes === 'number'
                   ? challengeData.countRoutes
                   : routeIdMap.length;
  if (routeIdMap.length < expected) {
    const maxId = routeIdMap.length ? Math.max(...routeIdMap) : 0;
    for (let i = routeIdMap.length; i < expected; i++) {
      routeIdMap.push(maxId + (i - routeIdMap.length) + 1);
    }
  }

  // Render header cells
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h.title;
    th.onclick = () => handleSort(h.key, 'field');
    theadRow.appendChild(th);
  });
  routeIdMap.forEach((id, idx) => {
    const th = document.createElement('th');
    th.textContent = `${idx + 1} cr.`;
    th.onclick = () => handleSort(String(id), 'route');
    theadRow.appendChild(th);
  });

  updateSortIndicators(headers, routeIdMap.map(String));

  // Render rows
  rows.forEach(r => {
    const tr = document.createElement('tr');
    if (r.completion) tr.dataset.completed = 'true';

    headers.forEach(h => {
      const td = document.createElement('td');
      td.textContent = h.key === 'completion'
        ? (r.completion
            ? new Date(r.completion).toLocaleString('uk', { dateStyle: 'short', timeStyle: 'short' })
            : '')
        : (r[h.key] ?? '');
      tr.appendChild(td);
    });

    routeIdMap.forEach(id => {
      const td = document.createElement('td');
      td.textContent = r.perRouteTime?.[id] || '';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

/**
 * Add sort arrows and (if multi-criteria) numbers to header cells.
 */
function updateSortIndicators(headers, routeOrder) {
  const ths = Array.from(document.querySelectorAll('#resultsTableHeader th'));
  ths.forEach(th => {
    th.textContent = th.textContent.replace(/ [▲▼] \d*$/, '').trim();
  });

  sortCriteria.forEach((c, i) => {
    let idx = -1;
    if (c.type === 'field') {
      idx = headers.findIndex(h => h.key === c.key);
    } else {
      const ridx = routeOrder.indexOf(c.key);
      if (ridx > -1) idx = headers.length + ridx;
    }
    if (idx > -1) {
      const arrow = c.dir === 'asc' ? '▲' : '▼';
      const ord   = sortCriteria.length > 1 ? ` ${i + 1}` : '';
      ths[idx].textContent += ` ${arrow}${ord}`;
    }
  });
}
