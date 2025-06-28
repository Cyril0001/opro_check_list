// js/data.js

// Базовый URL вашего API — напрямую по HTTPS
const BASE_URL = 'https://api.orienteering.pro/api';

/**
 *  Загружает результаты челленджа или ивента
 *  @param {number} challengeId
 *  @returns {Promise<Object>}
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
  return res.json();
}
