// js/main.js
import { fetchChallengeResults } from './data.js';

// --- Глобальний стан для даних та сортування ---
let originalData = [];
let sortCriteria = []; // Масив об'єктів, наприклад: [{ key: 'category', dir: 'asc' }]

document.addEventListener('DOMContentLoaded', async () => {
  const challengeId = 20; // або беріть з URL/data-атрибута
  try {
    const data = await fetchChallengeResults(challengeId);
    
    originalData = Array.isArray(data.data) ? data.data : [];
    
    recalculatePlaces(originalData);

    updateHeader(data);
    updateStatus(data);
    renderTable(originalData); // Перший рендер
    renderCategories(data.categories);
  } catch (err) {
    console.error(err);
    const statusEl = document.getElementById('challengeStatus');
    if (statusEl) statusEl.textContent = 'Помилка завантаження даних';
  }
});

// --- Функції для оновлення UI ---
function updateHeader(data) {
  const typeLabel = document.getElementById('challengeTypeLabel');
  const nameLabel = document.getElementById('challengeName');
  if (typeLabel) typeLabel.textContent = `OPRO – ${data.type}`;
  if (nameLabel) nameLabel.textContent = data.name;
}

function updateStatus(data) {
  const statusEl = document.getElementById('challengeStatus');
  if (!statusEl) return;
  if (data.type === 'CHALLENGE') {
    const done = originalData.filter(r => r.completion).length;
    const max = data.maxParticipants;
    if (max > 0 && done >= max) {
      statusEl.textContent = 'Завершено';
    } else {
      statusEl.textContent = `${done}/${max}`;
    }
  } else {
    statusEl.textContent = new Date(data.endDate) > new Date()
      ? 'Активний'
      : 'Завершено';
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

function recalculatePlaces(rows) {
  const groups = {};
  rows.forEach(r => {
    if (r.place != null) {
      groups[r.category] = groups[r.category] || [];
      groups[r.category].push(r);
    }
  });

  Object.values(groups).forEach(group => {
    group.sort((a, b) => a.place - b.place);
    group.forEach((r, idx) => {
      r.place = idx + 1;
    });
  });
}

// --- ОНОВЛЕНА ЛОГІКА СОРТУВАННЯ ---

/**
 * Обробляє клік по заголовку для сортування.
 * Клік додає критерій сортування. Повторний клік змінює напрямок.
 * @param {string} key - Ключ поля для сортування (e.g., 'category').
 * @param {string} type - 'field' або 'route'.
 */
function handleSort(key, type = 'field') {
  const criterion = { key, dir: 'asc', type };
  const existingIndex = sortCriteria.findIndex(c => c.key === key);

  if (existingIndex > -1) {
    // Критерій вже існує, просто змінюємо напрямок
    sortCriteria[existingIndex].dir = sortCriteria[existingIndex].dir === 'asc' ? 'desc' : 'asc';
  } else {
    // Новий критерій - додаємо його в кінець списку
    sortCriteria.push(criterion);
  }

  applySortAndRender();
}

/**
 * Застосовує поточні критерії сортування та перемальовує таблицю.
 */
function applySortAndRender() {
  let dataToSort = [...originalData];

  dataToSort.sort((a, b) => {
    for (const criterion of sortCriteria) {
      let valA, valB;

      if (criterion.type === 'route') {
        valA = a.perRouteTime?.[criterion.key];
        valB = b.perRouteTime?.[criterion.key];
      } else {
        valA = a[criterion.key];
        valB = b[criterion.key];
      }

      if (valA == null && valB != null) return 1;
      if (valA != null && valB == null) return -1;
      if (valA == null && valB == null) continue;

      const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      if (comparison !== 0) {
        return criterion.dir === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });

  renderTable(dataToSort);
}

/**
 * Основна функція рендерингу.
 * @param {Array} rowsToRender - Масив даних для відображення.
 */
function renderTable(rowsToRender) {
  const table = document.getElementById('resultsTable');
  const theadRow = document.getElementById('resultsTableHeader');
  const tbody = table.querySelector('tbody');
  theadRow.innerHTML = '';
  tbody.innerHTML = '';

  if (!rowsToRender.length) {
    tbody.innerHTML = '<tr><td colspan="3">Результатів поки немає</td></tr>';
    return;
  }

  const hasPlace = originalData.some(r => r.place != null);
  const hasScore = originalData.some(r => r.score != null);

  const headers = [
    { title: 'Cat.¹',    key: 'category'    },
    { title: 'Athlete',  key: 'athleteName' },
    { title: 'Number²',  key: 'number'      },
    ...(hasPlace ? [{ title: 'Place³', key: 'place' }] : []),
    ...(hasScore ? [{ title: 'Score⁴', key: 'score' }] : []),
    { title: 'Chance⁵',     key: 'chance'     },
    { title: 'Completion⁶', key: 'completion' },
    { title: 'Time⁷',       key: 'totalTime'  }
  ];

  const allRouteIds = originalData.flatMap(r => Object.keys(r.perRouteTime || {}).map(Number));
  const routeOrder = Array.from(new Set(allRouteIds)).sort((a, b) => a - b).map(String);

  // Рендер заголовків
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h.title;
    th.onclick = () => handleSort(h.key, 'field');
    theadRow.appendChild(th);
  });
  routeOrder.forEach((id, idx) => {
    const th = document.createElement('th');
    th.textContent = `${idx + 1} тр.`;
    th.onclick = () => handleSort(id, 'route');
    theadRow.appendChild(th);
  });
  
  // Оновлюємо візуальні індикатори в заголовках
  updateSortIndicators(headers, routeOrder);

  // Рендер рядків
  rowsToRender.forEach(r => {
    const tr = document.createElement('tr');
    if (r.completion) tr.dataset.completed = 'true';

    headers.forEach(h => {
      const td = document.createElement('td');
      td.textContent = h.key === 'completion'
        ? (r.completion ? new Date(r.completion).toLocaleString('uk', { dateStyle: 'short', timeStyle: 'short' }) : '')
        : (r[h.key] ?? '');
      tr.appendChild(td);
    });

    routeOrder.forEach(id => {
      const td = document.createElement('td');
      td.textContent = r.perRouteTime?.[id] || '';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

/**
 * ОНОВЛЕНО: Додає візуальні індикатори, знаходячи заголовок по індексу.
 * @param {Array} headers - Масив-опис основних заголовків.
 * @param {Array} routeOrder - Масив ID трас.
 */
function updateSortIndicators(headers, routeOrder) {
  const ths = Array.from(document.querySelectorAll('#resultsTableHeader th'));

  // Спершу очищуємо всі заголовки від старих індикаторів
  ths.forEach(th => {
    th.textContent = th.textContent.replace(/ [▲▼] \d*$/, '').trim();
  });

  // Додаємо нові індикатори на основі sortCriteria
  sortCriteria.forEach((criterion, index) => {
    let headerIndex = -1;

    if (criterion.type === 'field') {
      headerIndex = headers.findIndex(h => h.key === criterion.key);
    } else { // type === 'route'
      const routeIndex = routeOrder.findIndex(id => id === criterion.key);
      if (routeIndex > -1) {
        headerIndex = headers.length + routeIndex;
      }
    }

    // Якщо знайшли відповідний заголовок, додаємо індикатор
    if (headerIndex > -1 && ths[headerIndex]) {
      const arrow = criterion.dir === 'asc' ? '▲' : '▼';
      // Показуємо номер рівня сортування, якщо їх більше одного
      const order = sortCriteria.length > 1 ? ` ${index + 1}` : '';
      ths[headerIndex].textContent += ` ${arrow}${order}`;
    }
  });
}