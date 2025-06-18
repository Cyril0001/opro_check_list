// js/main.js

// Импортируем функции для генерации данных
import { generateFinalRunners, generateIntermediateRunners } from './data.js';

// Выполняем код после полной загрузки страницы
document.addEventListener('DOMContentLoaded', () => {

  // Проверяем, есть ли на странице таблица финальных результатов
  if (document.getElementById('resultsTable')) {
    const finalRunners = generateFinalRunners();
    renderFinalResults(finalRunners);
  }

  // Проверяем, есть ли на странице таблица промежуточных результатов
  if (document.getElementById('intermediateTable')) {
    const intermediateRunners = generateIntermediateRunners();
    renderIntermediateResults(intermediateRunners);
  }

});

/**
 * Отрисовывает таблицу ФИНАЛЬНЫХ результатов.
 * @param {Array} runners - Массив с данными участников.
 */
function renderFinalResults(runners) {
  const tbody = document.querySelector('#resultsTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  runners.forEach((row, idx) => {
    // Присваиваем номер участника после сортировки
    row.number = idx + 1;
    // ИСПРАВЛЕНО: Убраны некорректные теги и синтаксис
    tbody.innerHTML += `
      <tr>
        <td>${row.category}</td>
        <td>${row.name}</td>
        <td>${row.number}</td>
        <td>${idx + 1}</td>
        <td>${row.score}</td>
        <td>${row.bonus}</td>
        <td>${row.date}</td>
        <td>${row.time}</td>
      </tr>`;
  });
}

/**
 * Отрисовывает таблицу ПРОМЕЖУТОЧНЫХ результатов.
 * @param {Array} runners - Массив с данными участников.
 */
function renderIntermediateResults(runners) {
  const tbody = document.getElementById("intermediateBody");
  if (!tbody) return;

  tbody.innerHTML = '';
  runners.forEach(r => {
    const row = document.createElement('tr');
    
    const totalSeconds = r.times.reduce((acc, t) => {
      const [min, sec] = t.split(':').map(Number);
      return acc + min * 60 + sec;
    }, 0);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    // ИСПРАВЛЕНО: Убраны некорректные теги и синтаксис
    const resultText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    const timesHtml = r.times.map(t => `<td>${t}</td>`).join('');
    // ИСПРАВЛЕНО: Убраны некорректные теги и синтаксис
    row.innerHTML = `<td>${r.name}</td><td>${resultText}</td>${timesHtml}`;
    tbody.appendChild(row);
  });
}

/**
 * Функция сортировки для ПРОМЕЖУТОЧНОЙ таблицы.
 * @param {number} n - Индекс колонки для сортировки.
 */
window.sortTable = function(n) {
  const table = document.getElementById("intermediateTable");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.rows);
  const isAsc = table.dataset.sortAsc === 'true';

  rows.sort((a, b) => {
    let x = a.cells[n]?.innerText || '';
    let y = b.cells[n]?.innerText || '';
    return isAsc 
      ? x.localeCompare(y, undefined, { numeric: true }) 
      : y.localeCompare(x, undefined, { numeric: true });
  });

  // ЗАКОНЧЕНО: Добавлены недостающие строки
  // Вставляем отсортированные строки обратно в таблицу
  rows.forEach(r => tbody.appendChild(r));
  
  // Меняем направление для следующего клика
  table.dataset.sortAsc = (!isAsc).toString();
}