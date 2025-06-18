// js/data.js

// --- ГИБКИЕ КОНСТАНТЫ ДЛЯ СИМУЛЯЦИИ ---
const TOTAL_PARTICIPANTS = 65;
const TRACKS_COUNT = 10;
export const FINISHERS_REQUIRED_FOR_COMPLETION = 50;

// *** Измените это значение, чтобы симулировать разные этапы челленджа ***
//   - Установите < 50, чтобы челлендж был "текущим"
//   - Установите >= 50, чтобы челлендж стал "завершенным"
const FINISHED_PARTICIPANTS_TO_SIMULATE = 50;
// -----------------------------------------

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
  "Julie Hald", "Vegar Horn", "Emilia Eide", "Runar Gran", "Ella Knudsen",
  "Sander Vogt", "Hedda Lien", "Isak Bakke", "Frida Holm", "Aksel Lund",
  "Thea Iversen", "Håkon Solberg", "Jenny Riise", "Filip Strøm", "Astrid Moen"
];

/**
 * Генерирует данные для ВСЕХ стартовавших участников.
 */
export function generateIntermediateRunners() {
  const generateRandomTime = () => {
    const minutes = String(20 + Math.floor(Math.random() * 30)).padStart(2, '0');
    const seconds = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return Array.from({ length: TOTAL_PARTICIPANTS }, (_, i) => {
    const name = scandinavianNames[i % scandinavianNames.length] + (i >= scandinavianNames.length ? ` ${i - scandinavianNames.length + 2}` : '');
    let times = [];

    if (i < FINISHED_PARTICIPANTS_TO_SIMULATE) {
      times = Array.from({ length: TRACKS_COUNT }, generateRandomTime);
    } else {
      const completedCount = 1 + Math.floor(Math.random() * (TRACKS_COUNT - 2));
      times = Array(TRACKS_COUNT).fill('');
      for (let j = 0; j < completedCount; j++) {
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * TRACKS_COUNT);
        } while (times[randomIndex] !== '');
        times[randomIndex] = generateRandomTime();
      }
    }
    return { 
      name, 
      times,
      category: 1 + (i % 8)
    };
  });
}

/**
 * Рассчитывает очки (Score) для финишеров.
 */
function calculateScores(finishers) {
  const scores = new Map();
  const toSeconds = t => t.split(':').reduce((s, v, i) => s + (+v) * (i === 0 ? 60 : 1), 0);

  for (let trackIndex = 0; trackIndex < TRACKS_COUNT; trackIndex++) {
    const trackResults = finishers
      .map(runner => ({
        name: runner.name,
        time: toSeconds(runner.times[trackIndex])
      }))
      .sort((a, b) => a.time - b.time);

    trackResults.forEach((result, placeIndex) => {
      const points = placeIndex + 1;
      scores.set(result.name, (scores.get(result.name) || 0) + points);
    });
  }
  return scores;
}

/**
 * Генерирует финальные данные ТОЛЬКО для тех, кто завершил все трассы.
 */
export function generateFinalRunners(intermediateRunners) {
  const finishers = intermediateRunners.filter(r => r.times.every(t => t !== ''));
  if (finishers.length === 0) return [];

  const toSeconds = t => t.split(':').reduce((s, v, i) => s + (+v) * (i === 0 ? 60 : 1), 0);
  const getRandomDateTime = (baseDay, index) => {
    const date = new Date(2025, 6, baseDay + Math.floor(index / 10), 9 + (index % 10), (index * 7) % 60);
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };
  const getBonusChances = order => (order <= 5 ? 'x10' : order <= 10 ? 'x5' : order <= 15 ? 'x3' : '');
  
  let finalData = finishers.map((runner, i) => ({
    ...runner,
    date: getRandomDateTime(1, i),
  }));
  
  finalData.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  finalData.forEach((runner, index) => {
    runner.number = index + 1;
    runner.bonus = getBonusChances(runner.number);
  });

  const calculatedScores = calculateScores(finalData);
  finalData.forEach(runner => {
    runner.score = calculatedScores.get(runner.name) || 0;
  });

  finalData.forEach(r => {
      const totalSeconds = r.times.reduce((total, t) => total + toSeconds(t), 0);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      r.time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  // Сортируем по очкам (Score) для определения общего места (Place)
  finalData.sort((a, b) => a.score - b.score);

  // ИЗМЕНЕНИЕ: Присваиваем общее место (Place) на основе сортировки по очкам
  finalData.forEach((runner, index) => {
    runner.place = index + 1;
  });

  return finalData;
}