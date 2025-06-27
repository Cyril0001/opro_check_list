// js/main.js
import { fetchChallengeResults } from './data.js';

// --- Глобальний стан для даних та сортування ---
let originalData = [];
let sortCriteria = []; // Масив об'єктів, наприклад: [{ key: 'category', dir: 'asc' }]

document.addEventListener('DOMContentLoaded', async () => {
  const challengeId = 20; // або беріть з URL/data-атрибута
  try {
    const data = await fetchChallengeResults(challengeId);
    
    // Зберігаємо початкові дані один раз
    originalData = Array.isArray(data.data) ? data.data : [];
    
    // Перераховуємо місця всередині категорій при завантаженні
    recalculatePlaces(originalData);

    updateHeader(data);
    updateStatus(data);
    renderTable(originalData, data.countRoutes); // Перший рендер з початковими даними
    renderCategories(data.categories);
  } catch (err) {
    console.error(err);
    const statusEl = document.getElementById('challengeStatus');
    // Оновлено: повідомлення про помилку українською
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

/**
 * ОНОВЛЕНО: Логіка статусу
 */
function updateStatus(data) {
  const statusEl = document.getElementById('challengeStatus');
  if (!statusEl) return;
  if (data.type === 'CHALLENGE') {
    const done = originalData.filter(r => r.completion).length;
    const max = data.maxParticipants;

    // Якщо кількість завершених дорівнює максимуму, показуємо "Завершено"
    if (max > 0 && done >= max) {
      statusEl.textContent = 'Завершено';
    } else {
      statusEl.textContent = `${done}/${max}`;
    }
    
  } else {
    // Для івентів логіка залишається тією ж
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

/**
 * Перераховує місця всередині кожної категорії.
 * Ця функція мутує вихідний масив даних.
 */
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


// --- Логіка сортування ---

/**
 * Обробляє клік по заголовку для сортування.
 * @param {MouseEvent} event - Подія кліку.
 * @param {string} key - Ключ поля для сортування (e.g., 'category').
 * @param {string} type - 'field' або 'route' для різних типів колонок.
 */
function handleSort(event, key, type = 'field') {
  const isShiftClick = event.shiftKey;
  const criterion = { key, dir: 'asc', type };

  const existingIndex = sortCriteria.findIndex(c => c.key === key);

  if (existingIndex > -1) {
    sortCriteria[existingIndex].dir = sortCriteria[existingIndex].dir === 'asc' ? 'desc' : 'asc';
    if (!isShiftClick) {
      sortCriteria = [sortCriteria[existingIndex]];
    }
  } else {
    if (!isShiftClick) {
      sortCriteria = [];
    }
    sortCriteria.push(criterion);
  }

  applySortAndRender();
}

/**
 * Применяет текущие критерии сортировки и перерисовывает таблицу.
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
  
  const countRoutes = originalData.length > 0 ? Math.max(...originalData.map(r => Object.keys(r.perRouteTime || {}).length)) : 0;
  renderTable(dataToSort, countRoutes);
}


/**
 * Основна функція рендерингу. Тепер вона просто "рисує" передані дані.
 * @param {Array} rowsToRender - Масив даних для відображення.
 * @param {number} countRoutes - Кількість трас.
 */
function renderTable(rowsToRender, countRoutes) {
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
    th.onclick = (event) => handleSort(event, h.key, 'field');
    theadRow.appendChild(th);
  });
  routeOrder.forEach((id, idx) => {
    const th = document.createElement('th');
    th.textContent = `${idx + 1} тр.`;
    th.onclick = (event) => handleSort(event, id, 'route');
    theadRow.appendChild(th);
  });
  
  updateSortIndicators();

  // Рендер строк
  rowsToRender.forEach(r => {
    const tr = document.createElement('tr');
    if (r.completion) tr.dataset.completed = 'true';

    headers.forEach(h => {
      const td = document.createElement('td');
      // Оновлено: формат дати українською
      td.textContent = h.key === 'completion'
        ? (r.completion ? new Date(r.completion).toLocaleString('uk', {dateStyle:'short', timeStyle:'short'}) : '')
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
 * Добавляет визуальные индикаторы (стрелки, цифры) к заголовкам.
 */
function updateSortIndicators() {
  const ths = document.querySelectorAll('#resultsTableHeader th');
  
  ths.forEach(th => {
    th.innerHTML = th.innerHTML.replace(/ [▲▼] \d*$/, '');
  });

  sortCriteria.forEach((criterion, index) => {
    const header = findHeaderByKey(criterion.key);
    if (header.th) {
      const arrow = criterion.dir === 'asc' ? '▲' : '▼';
      const order = sortCriteria.length > 1 ? ` ${index + 1}` : '';
      header.th.innerHTML += ` ${arrow}${order}`;
    }
  });
}

function findHeaderByKey(key) {
    const ths = Array.from(document.querySelectorAll('#resultsTableHeader th'));
    for (let i = 0; i < ths.length; i++) {
        const headerText = ths[i].textContent.replace(/ [▲▼] \d*$/, '');
        if (headerText.toLowerCase().includes(key.substring(0,3))) {
            return { th: ths[i] };
        }
    }
    return {};
}