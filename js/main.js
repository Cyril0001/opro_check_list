// js/main.js
import { fetchChallengeResults } from './data.js';

document.addEventListener('DOMContentLoaded', async () => {
  const challengeId = 20; // замените на нужный или берите из URL/data-атрибута
  try {
    const data = await fetchChallengeResults(challengeId);
    updateHeader(data);
    updateStatus(data);
    renderTable(data);
  } catch (err) {
    console.error(err);
    const statusEl = document.getElementById('challengeStatus');
    if (statusEl) statusEl.textContent = 'Ошибка загрузки данных';
  }
});

/** Заголовок «OPRO – {type}» и имя челленджа */
function updateHeader(data) {
  const typeLabel = document.getElementById('challengeTypeLabel');
  const nameLabel = document.getElementById('challengeName');
  if (typeLabel) typeLabel.textContent = `OPRO – ${data.type}`;
  if (nameLabel) nameLabel.textContent = data.name;
}

/** Статус CHALLENGE — X/Y, EVENT — «Активен»/«Завершён» */
function updateStatus(data) {
  const statusEl = document.getElementById('challengeStatus');
  if (!statusEl) return;

  if (data.type === 'CHALLENGE') {
    const doneCount = (data.data || []).filter(r => r.completion).length;
    statusEl.textContent = `${doneCount}/${data.maxParticipants}`;
  } else {
    const now = new Date();
    statusEl.textContent = new Date(data.endDate) > now ? 'Активен' : 'Завершён';
  }
}

/**
 * Строит таблицу:
 * 1) Cat.¹, Athlete, Number²
 * 2) Place³, Score⁴ (если есть в данных) — перед Chance⁵
 * 3) Chance⁵, Completion⁶, Time⁷
 * 4) Динамические колонки «1 тр.», «2 тр.» … «N тр.»
 *    Причём «i тр.» привязан к ID трассы из perRouteTime, а не просто к порядковому номеру.
 */
function renderTable(data) {
  const rows = Array.isArray(data.data) ? data.data : [];
  const declaredCount = data.countRoutes || 0;

  const table    = document.getElementById('resultsTable');
  const theadRow = document.getElementById('resultsTableHeader');
  const tbody    = table.querySelector('tbody');
  theadRow.innerHTML = '';
  tbody.innerHTML   = '';

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3">Результатов пока нет</td></tr>';
    return;
  }

  // 1) Определяем, есть ли в данных place и score
  const hasPlace = rows.some(r => r.place != null);
  const hasScore = rows.some(r => r.score != null);

  // 2) Собираем базовые колонки и вставляем place/score перед Chance
  const headerDefs = [
    { title: 'Cat.¹',      key: 'category'   },
    { title: 'Athlete',    key: 'athleteName' },
    { title: 'Number²',    key: 'number'      },
    ...(hasPlace ? [{ title: 'Place³', key: 'place' }] : []),
    ...(hasScore ? [{ title: 'Score⁴', key: 'score' }] : []),
    { title: 'Chance⁵',    key: 'chance'     },
    { title: 'Completion⁶',key: 'completion'},
    { title: 'Time⁷',      key: 'totalTime'  }
  ];

  // 3) Вычисляем порядок трасс по их ID
  // Собираем все ID из perRouteTime у всех строк
  const allIds = [];
  rows.forEach(r => {
    if (r.perRouteTime) {
      Object.keys(r.perRouteTime).forEach(id => {
        allIds.push(parseInt(id, 10));
      });
    }
  });
  // Уникальный и отсортированный список ID трасс
  const routeOrder = Array.from(new Set(allIds))
    .sort((a, b) => a - b)
    .slice(0, declaredCount)      // на случай, если backend вернул больше
    .map(id => id.toString());

  const numRoutes = routeOrder.length;

  // 4) Рендер заголовка
  headerDefs.forEach((h, idx) => {
    const th = document.createElement('th');
    th.textContent = h.title;
    th.onclick = () => sortTable(th, idx);
    theadRow.appendChild(th);
  });
  // колонки «1 тр.», «2 тр.» … «N тр.»
  for (let i = 0; i < numRoutes; i++) {
    const idx = headerDefs.length + i;
    const th  = document.createElement('th');
    th.textContent = `${i + 1} тр.`;  // номер по порядку в routeOrder
    th.onclick = () => sortTable(th, idx);
    theadRow.appendChild(th);
  }

  // 5) Рендер строк
  rows.forEach(r => {
    const tr = document.createElement('tr');
    if (r.completion) tr.setAttribute('data-completed', 'true');

    // статичные колонки
    headerDefs.forEach(h => {
      const td = document.createElement('td');
      if (h.key === 'completion') {
        td.textContent = r.completion
          ? new Date(r.completion).toLocaleString()
          : '';
      } else {
        td.textContent = r[h.key] != null ? r[h.key] : '';
      }
      tr.appendChild(td);
    });

    // динамические времена по трассам согласно routeOrder
    routeOrder.forEach(id => {
      const td = document.createElement('td');
      td.textContent = (r.perRouteTime && r.perRouteTime[id]) || '';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

/** Сортировка по столбцу (текст/числа) */
function sortTable(thElem, colIndex) {
  const table = thElem.closest('table');
  const tbody = table.querySelector('tbody');
  const rows  = Array.from(tbody.rows);
  const asc   = table.dataset.sortAsc === 'true';

  rows.sort((a, b) => {
    const aText = a.cells[colIndex]?.innerText || '';
    const bText = b.cells[colIndex]?.innerText || '';
    if (!aText && bText) return 1;
    if (aText && !bText) return -1;
    return asc
      ? aText.localeCompare(bText, undefined, { numeric: true })
      : bText.localeCompare(aText, undefined, { numeric: true });
  });

  rows.forEach(r => tbody.appendChild(r));
  table.dataset.sortAsc = (!asc).toString();
}
