'use strict';

const CACHE_TTL_MS = 30 * 60 * 1000;      // 30 minutes (NBU updates once per day)
const STALE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours hard limit

let cache = { rate: null, date: null, ts: 0 };

/**
 * Fetch official EUR/UAH exchange rate from the National Bank of Ukraine.
 * API docs: https://bank.gov.ua/en/open-data/api-dev
 * Returns { rate, date } or null on failure.
 */
async function fetchFromNBU() {
  const url = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=EUR&json';
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;

  const data = await res.json();
  if (!Array.isArray(data) || !data.length) return null;

  const entry = data[0];
  if (!entry.rate || entry.cc !== 'EUR') return null;

  return { rate: entry.rate, date: entry.exchangedate };
}

/**
 * Get EUR → UAH rate with caching.
 * @returns {{ rate: number, date: string, ts: number }}
 */
async function getEurUahRate() {
  const now = Date.now();

  if (cache.rate && (now - cache.ts) < CACHE_TTL_MS) {
    return { rate: cache.rate, date: cache.date, ts: cache.ts };
  }

  let result = null;
  try { result = await fetchFromNBU(); } catch (e) { /* timeout/network */ }

  if (result) {
    cache = { rate: result.rate, date: result.date, ts: now };
    return { rate: result.rate, date: result.date, ts: now };
  }

  // NBU failed — use stale cache if available
  if (cache.rate && (now - cache.ts) < STALE_LIMIT_MS) {
    console.warn('[nbu-rate] NBU API failed, using cached rate from', new Date(cache.ts).toISOString());
    return { rate: cache.rate, date: cache.date, ts: cache.ts };
  }

  console.warn('[nbu-rate] NBU API unavailable and no cache, using fallback rate');
  return { rate: 45.0, date: '—', ts: 0 };
}

module.exports = { getEurUahRate };
