// js/data.js

// Базовый URL вашего API
const BASE_URL = 'http://185.26.96.243:8889/api';

/**
 *  Загружает результаты челленджа или ивента
 *  @param {number} challengeId
 *  @returns {Promise<Object>} JSON с полями name, startDate, endDate, countRoutes, type,
 *                            maxParticipants, categories, data (массив результатов)
 */
export async function fetchChallengeResults(challengeId) {
  const res = await fetch(
    `${BASE_URL}/admin/challenges/${challengeId}/results`,
    {
      headers: {
        'App-Type': 'site'
      }
    }
  );
  if (!res.ok) {
    throw new Error(`Ошибка при загрузке данных: ${res.status}`);
  }
  return await res.json();
}
