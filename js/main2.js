// js/main.js
import { fetchChallengeResults } from './data.js';

// --- Global state ---
let originalData = [];
let sortCriteria = [];
let challengeData = {};
let routeIdMap = [];

document.addEventListener('DOMContentLoaded', async () => {
  const challengeId = 35; // or pull from URL/data-attribute
  try {
    const data = await fetchChallengeResults(challengeId);
    challengeData = data;
    originalData = Array.isArray(data.data) ? data.data : [];

    // Calculate official places if categories are numeric
    calculateOfficialPlaces(originalData);

    // Initial render
    updateHeader(data);
    updateStatus(data);
    renderTable(originalData);
    renderCategories(data.categories);

    // Wire up export button
    const btn = document.getElementById('exportBtn');
    if (btn) btn.addEventListener('click', exportToCSV);
  } catch (err) {
    console.error(err);
    const statusEl = document.getElementById('challengeStatus');
    if (statusEl) statusEl.textContent = 'Произошла ошибка при загрузке данных...';
  }
});

// --- UI helpers ---
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
    el.textContent = new Date(data.endDate) > new Date() ? 'Active' : 'Finished';
  }
}

function renderCategories(categories = []) {
  const ul = document.getElementById('categoryList');
  if (!ul) return;
  ul.innerHTML = '';
  categories.forEach(cat => {
    const li = document.createElement('li');
    li.textContent = `${cat.numberCategory} — ${cat.description}`;
    ul.appendChild(li);
  });
}

/**
 * Calculate official places only when categories are numeric.
 */
function calculateOfficialPlaces(rows) {
  const numericRows = rows.filter(r => !isNaN(parseInt(r.category, 10)));
  if (numericRows.length === 0) return;

  const groups = {};
  numericRows.forEach(r => {
    const num = parseInt(r.category, 10);
    if (r.score != null && !isNaN(num)) {
      (groups[num] ||= []).push(r);
    }
  });

  Object.values(groups).forEach(group => {
    group.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return String(a.totalTime).localeCompare(String(b.totalTime), undefined, { numeric: true });
    });
    group.forEach((r, idx) => { r.place = idx + 1; });
  });
}

// --- Sorting ---
function handleSort(key, type = 'field') {
  const idx = sortCriteria.findIndex(c => c.key === key);
  if (idx > -1) {
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
      let vA = c.type === 'route' ? a.perRouteTime?.[c.key] : a[c.key];
      let vB = c.type === 'route' ? b.perRouteTime?.[c.key] : b[c.key];

      if (vA == null && vB != null) return 1;
      if (vA != null && vB == null) return -1;
      if (vA == null && vB == null) continue;

      const cmp = String(vA).localeCompare(String(vB), undefined, { numeric: true });
      if (cmp !== 0) return c.dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });

  // Do not overwrite official places
  renderTable(dataToSort);
}

// --- Table rendering ---
function renderTable(rows) {
  const table    = document.getElementById('resultsTable');
  const theadRow = document.getElementById('resultsTableHeader');
  const tbody    = table.querySelector('tbody');
  theadRow.innerHTML = '';
  tbody.innerHTML   = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="3">Результатов пока нет</td></tr>';
    return;
  }

  const hasPlace = originalData.some(r => r.place != null);
  const hasScore = originalData.some(r => r.score != null);
  const headers = [
    { title: 'Cat.¹',      key: 'category'    },
    { title: 'Athlete',    key: 'athleteName' },
    { title: 'Number²',    key: 'number'      },
    ...(hasPlace ? [{ title: 'Place³',   key: 'place'   }] : []),
    ...(hasScore ? [{ title: 'Score⁴',   key: 'score'   }] : []),
    ...(challengeData.type === 'CHALLENGE' ? [{ title: 'Chance⁵', key: 'chance' }] : []),
    { title: 'Completion⁶', key: 'completion'  },
    { title: 'Time⁷',       key: 'totalTime'   }
  ];

  // Build route columns
  const idSet = new Set();
  originalData.forEach(r =>
    Object.keys(r.perRouteTime || {}).forEach(id => idSet.add(Number(id)))
  );
  routeIdMap = Array.from(idSet).sort((a, b) => a - b);

  const expected = typeof challengeData.countRoutes === 'number'
    ? challengeData.countRoutes
    : routeIdMap.length;
  if (routeIdMap.length < expected) {
    const maxId = routeIdMap.length ? Math.max(...routeIdMap) : 0;
    for (let i = routeIdMap.length; i < expected; i++) {
      routeIdMap.push(maxId + i + 1);
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

function updateSortIndicators(headers, routeOrder) {
  const ths = Array.from(document.querySelectorAll('#resultsTableHeader th'));
  ths.forEach(th => th.textContent = th.textContent.replace(/ [▲▼] \d*$/, '').trim());

  sortCriteria.forEach((c, i) => {
    let idx = c.type === 'field'
      ? headers.findIndex(h => h.key === c.key)
      : headers.length + routeOrder.indexOf(c.key);
    if (idx > -1) {
      const arrow = c.dir === 'asc' ? '▲' : '▼';
      const ord   = sortCriteria.length > 1 ? ` ${i + 1}` : '';
      ths[idx].textContent += ` ${arrow}${ord}`;
    }
  });
}

/**
 * Build CSV from table and trigger download.
 */
function exportToCSV() {
  const rows = [];
  // header
  const headerCells = Array.from(document.querySelectorAll('#resultsTableHeader th'));
  rows.push(headerCells.map(th => `"${th.textContent}"`).join(','));
  // body
  document.querySelectorAll('#resultsTable tbody tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td'));
    const row = cells.map(td =>
      `"${td.textContent.replace(/"/g, '""')}"`
    );
    rows.push(row.join(','));
  });

  const blob = new Blob([rows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${challengeData.name.replace(/\s+/g,'_')}_results.csv`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
