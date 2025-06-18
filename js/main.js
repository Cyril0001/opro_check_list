// js/main.js
import { generateFinalRunners, generateIntermediateRunners, FINISHERS_REQUIRED_FOR_COMPLETION } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
  const table = document.getElementById('resultsTable');
  if (!table) return;

  const intermediateRunners = generateIntermediateRunners();
  const finalRunners = generateFinalRunners(intermediateRunners);

  const statusEl = document.getElementById('challengeStatus');
  const challengeIsComplete = finalRunners.length >= FINISHERS_REQUIRED_FOR_COMPLETION;

  // Управляем статусом челленджа
  if (statusEl) {
    if (challengeIsComplete) {
      const fiftiethFinisher = [...finalRunners].sort((a,b) => a.number - b.number)[FINISHERS_REQUIRED_FOR_COMPLETION - 1];
      statusEl.innerHTML = `завершен:<br/>${fiftiethFinisher.date}`;
    } else {
      statusEl.innerHTML = `текущий<br/><span class="subtitle">${finalRunners.length} из ${FINISHERS_REQUIRED_FOR_COMPLETION} завершили</span>`;
    }
  }

  // Управляем видимостью колонок
  if (challengeIsComplete) {
    table.classList.add('challenge-complete');
  } else {
    table.classList.remove('challenge-complete');
  }

  renderCombinedResults(table, finalRunners, intermediateRunners, challengeIsComplete);
});

function renderCombinedResults(table, finalRunners, intermediateRunners, challengeIsComplete) {
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  const finalMap = new Map(finalRunners.map(r => [r.name, r]));
  
  const displayList = intermediateRunners.map(r => ({
    ...r,
    isFinished: finalMap.has(r.name)
  }));
  
  displayList.sort((a, b) => {
    if (a.isFinished !== b.isFinished) return b.isFinished - a.isFinished;
    if (a.isFinished) { // Если оба финишеры, сортируем по номеру (порядку финиша)
      return finalMap.get(a.name).number - finalMap.get(b.name).number;
    }
    return a.name.localeCompare(b.name); // Иначе по имени
  });

  displayList.forEach(runner => {
    const tr = document.createElement('tr');
    const finData = finalMap.get(runner.name);
    
    if (finData) {
      if (challengeIsComplete) {
        tr.classList.add('completed');
      }
      tr.innerHTML = `
        <td>${finData.category}</td>
        <td>${finData.name}</td>
        <td>${finData.number}</td>
        <td>${finData.place}</td>
        <td>${finData.score}</td>
        <td>${finData.bonus}</td>
        <td>${finData.date}</td>
        <td>${finData.time}</td>
        ${runner.times.map(t => `<td>${t}</td>`).join('')}
      `;
    } else {
      tr.innerHTML = `
        <td>${runner.category}</td>
        <td>${runner.name}</td>
        <td></td><td></td><td></td><td></td><td></td><td></td>
        ${runner.times.map(t => `<td>${t}</td>`).join('')}
      `;
    }
    tbody.appendChild(tr);
  });
}

window.sortTable = function(thElem, colIndex) {
  const table = thElem.closest('table');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.rows);
  const asc = table.dataset.sortAsc === 'true';

  rows.sort((a, b) => {
    const aText = a.cells[colIndex]?.innerText || '';
    const bText = b.cells[colIndex]?.innerText || '';
    if (aText === '' && bText !== '') return 1;
    if (aText !== '' && bText === '') return -1;
    if (aText === '' && bText === '') return 0;
    
    return asc
      ? aText.localeCompare(bText, undefined, { numeric: true })
      : bText.localeCompare(aText, undefined, { numeric: true });
  });

  rows.forEach(r => tbody.appendChild(r));
  table.dataset.sortAsc = (!asc).toString();
};