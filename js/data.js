// js/data.js

// Общий массив имен, используется в обеих функциях
const scandinavianNames = [
  "Lars Nilsen", "Erik Johansen", "Kari Olsen", "Anna Berg", "Mats Andersson",
  "Nina Haugen", "Sven Lindgren", "Greta Eklund", "Ole Pedersen", "Ingrid Dahl",
  "Torbjörn Holm", "Helga Knutsen", "Jonas Strand", "Maria Lund", "Henrik Larsen",
  "Elin Sørensen", "Magnus Björk", "Liv Hansen", "Jens Sandvik", "Tuva Blom",
  "Kasper Aas", "Maja Hovland", "Stian Røed", "Ida Nyström", "Kristian Moe",
  "Tiril Foss", "Eirik Sten", "Anja Myhre", "Emil Karlsen", "Sofia Norrman",
  "Martin Sunde", "Camilla Vang", "Fredrik Thorsen", "Selma Ruud", "Andreas Vik",
  "Malin Berge", "Thomas Nygaard", "Ronja Åkesson", "Leif Arnesen", "Nora Svendsen",
  "Daniel Hauger", "Vilde Lie", "Oskar Eskilsson", "Signe Thune", "Robin Fagerström",
  "Julie Hald", "Vegar Horn", "Emilia Eide", "Runar Gran", "Ella Knudsen"
];


/**
 * Генерирует данные для страницы с ФИНАЛЬНЫМИ результатами
 */
export function generateFinalRunners() {
  const toSeconds = t =>
    t.split(':').reduce((s, v, i) => s + (+v) * Math.pow(60, 2 - i), 0);

  const toDate = d =>
    new Date(`2025-${d.split(' ')[0]}T${d.split(' ')[1]}`);

  const getRandomDateTime = (baseDay, index) => {
    const date = new Date(2025, 5, baseDay + Math.floor(index / 10), 9 + (index % 10), (index * 7) % 60);
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getBonusChances = completionOrder => {
    if (completionOrder <= 5) return 'x10';
    if (completionOrder <= 10) return 'x5';
    if (completionOrder <= 15) return 'x3';
    return '';
  };

  let runners = Array.from({ length: 50 }, (_, i) => {
    const completionOrder = (i * 13) % 50;
    return {
      category: 1 + Math.floor(Math.random() * 8),
      name: scandinavianNames[i % scandinavianNames.length],
      number: undefined,
      score: 10 + Math.floor(Math.random() * 40),
      bonus: getBonusChances(completionOrder + 1),
      date: getRandomDateTime(1, completionOrder),
      time: `${String(1 + Math.floor(Math.random() * 3)).padStart(2, '0')}:` +
            `${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:` +
            `${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
    };
  });

  runners.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const da = toDate(a.date), db = toDate(b.date);
    if (da.getTime() !== db.getTime()) return da - db;
    return toSeconds(a.time) - toSeconds(b.time);
  });

  return runners;
}


/**
 * Генерирует данные для страницы с ПРОМЕЖУТОЧНЫМИ результатами
 */
export function generateIntermediateRunners() {
  const generateRandomTime = () => {
    const minutes = String(30 + Math.floor(Math.random() * 20)).padStart(2, '0');
    const seconds = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return Array.from({ length: 50 }, (_, i) => {
    const name = scandinavianNames[i % scandinavianNames.length];
    const times = Array.from({ length: 10 }, () => generateRandomTime());
    return { name, times };
  });
}