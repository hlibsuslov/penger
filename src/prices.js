'use strict';

const BigNumber = require('bignumber.js');

const CACHE_TTL_MS = 60 * 1000;        // 60 seconds
const STALE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes hard limit (was 5)
const QUOTE_EXPIRY_S = 900;             // 15 minutes

let cache = { solEur: null, usdcEur: null, ts: 0 };

/**
 * Try fetching prices from CoinGecko.
 * Returns { solEur, usdcEur } or null on failure.
 */
async function tryCoingecko() {
  const apiKey = process.env.COINGECKO_API_KEY;
  const baseUrl = apiKey
    ? 'https://pro-api.coingecko.com/api/v3'
    : 'https://api.coingecko.com/api/v3';

  const url = `${baseUrl}/simple/price?ids=solana,usd-coin&vs_currencies=eur`;
  const headers = apiKey ? { 'x-cg-pro-api-key': apiKey } : {};

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;

  const data = await res.json();
  const solEur = data.solana?.eur;
  const usdcEur = data['usd-coin']?.eur;
  if (!solEur || !usdcEur) return null;
  return { solEur, usdcEur };
}

/**
 * Fallback: Binance public API (no key required, generous rate limits).
 * Fetches SOL/EUR and USDC/EUR via SOL/USDT + USDT/EUR conversion.
 */
async function tryBinance() {
  const url = 'https://api.binance.com/api/v3/ticker/price?symbols=["SOLUSDT","EURUSDT"]';
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;

  const data = await res.json();
  const solUsdt = parseFloat(data.find(t => t.symbol === 'SOLUSDT')?.price);
  const eurUsdt = parseFloat(data.find(t => t.symbol === 'EURUSDT')?.price);
  if (!solUsdt || !eurUsdt) return null;

  const solEur = solUsdt / eurUsdt;
  const usdcEur = 1 / eurUsdt; // USDC ≈ 1 USD ≈ 1 USDT
  return { solEur, usdcEur };
}

async function fetchPrices() {
  const now = Date.now();
  if (cache.solEur && (now - cache.ts) < CACHE_TTL_MS) {
    return { solEur: cache.solEur, usdcEur: cache.usdcEur, ts: cache.ts };
  }

  // Try CoinGecko first, then Binance as fallback
  let prices = null;
  try { prices = await tryCoingecko(); } catch (e) { /* timeout/network */ }

  if (!prices) {
    console.warn('[prices] CoinGecko failed, trying Binance fallback...');
    try { prices = await tryBinance(); } catch (e) { /* timeout/network */ }
  }

  if (prices) {
    cache = { solEur: prices.solEur, usdcEur: prices.usdcEur, ts: now };
    return { solEur: prices.solEur, usdcEur: prices.usdcEur, ts: now };
  }

  // Both providers failed — use stale cache if available
  if (cache.solEur && (now - cache.ts) < STALE_LIMIT_MS) {
    console.warn('[prices] All providers failed, using cached price from', new Date(cache.ts).toISOString());
    return { solEur: cache.solEur, usdcEur: cache.usdcEur, ts: cache.ts };
  }

  throw new Error('Price feed unavailable and cache is stale');
}

/**
 * Get a quote for a given EUR amount in cents.
 * @param {number} eurCents - Amount in EUR cents (e.g. 4900 = EUR 49.00)
 * @param {'SOL'|'USDC'} asset
 * @returns {{ cryptoAmount: string, amountRaw: string, rate: string, expiresAt: number }}
 */
async function getQuote(eurCents, asset) {
  const prices = await fetchPrices();
  const eurTotal = new BigNumber(eurCents).div(100);

  let cryptoAmount, amountRaw, rate;

  if (asset === 'SOL') {
    rate = new BigNumber(prices.solEur);
    cryptoAmount = eurTotal.div(rate);
    // ceil(amount * 1e9) lamports to avoid underpayment
    amountRaw = cryptoAmount.times(1e9).integerValue(BigNumber.ROUND_CEIL).toFixed(0);
    cryptoAmount = cryptoAmount.decimalPlaces(9, BigNumber.ROUND_CEIL).toFixed();
  } else if (asset === 'USDC') {
    rate = new BigNumber(prices.usdcEur);
    cryptoAmount = eurTotal.div(rate);
    // ceil(amount * 1e6) raw units
    amountRaw = cryptoAmount.times(1e6).integerValue(BigNumber.ROUND_CEIL).toFixed(0);
    cryptoAmount = cryptoAmount.decimalPlaces(6, BigNumber.ROUND_CEIL).toFixed();
  } else {
    throw new Error('Unsupported asset: ' + asset);
  }

  return {
    cryptoAmount,
    amountRaw,
    rate: rate.toFixed(),
    priceTimestamp: prices.ts,
    expiresAt: Date.now() + QUOTE_EXPIRY_S * 1000,
  };
}

module.exports = { fetchPrices, getQuote };
