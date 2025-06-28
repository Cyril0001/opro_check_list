// js/data.js

// Базовий URL вашого API — теперь через HTTPS напрямую или через прокси Vercel
const BASE_URL = '/api'; // относительный путь, если используем прокси на Vercel
// const BASE_URL = 'https://api.orienteering.pro/api'; // напрямую

/**
 * Загружает результаты челленджа или ивента
 * @param {number} challengeId
 * @returns {Promise<Object>} JSON с полями name, startDate, endDate, countRoutes, type,
 *                            maxParticipants, categories, data (массив результатов)
 */
export async function fetchChallengeResults(challengeId) {
  const res = await fetch(
    `${BASE_URL}/admin/challenges/${challengeId}/results`,
    { headers: { 'App-Type': 'site' } }
  );
  if (!res.ok) {
    throw new Error(`Ошибка при загрузке данных: ${res.status}`);
  }
  return res.json();
}