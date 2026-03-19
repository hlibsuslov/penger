'use strict';

const BigNumber = require('bignumber.js');

const CACHE_TTL_MS = 60 * 1000;        // 60 seconds
const STALE_LIMIT_MS = 5 * 60 * 1000;  // 5 minutes hard limit
const QUOTE_EXPIRY_S = 900;             // 15 minutes

let cache = { solEur: null, usdcEur: null, ts: 0 };

async function fetchPrices() {
  const now = Date.now();
  if (cache.solEur && (now - cache.ts) < CACHE_TTL_MS) {
    return { solEur: cache.solEur, usdcEur: cache.usdcEur, ts: cache.ts };
  }

  const apiKey = process.env.COINGECKO_API_KEY;
  const baseUrl = apiKey
    ? 'https://pro-api.coingecko.com/api/v3'
    : 'https://api.coingecko.com/api/v3';

  const url = `${baseUrl}/simple/price?ids=solana,usd-coin&vs_currencies=eur&include_last_updated_at=true`;
  const headers = apiKey ? { 'x-cg-pro-api-key': apiKey } : {};

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    if (cache.solEur && (now - cache.ts) < STALE_LIMIT_MS) {
      console.warn('[prices] CoinGecko error, using cached price from', new Date(cache.ts).toISOString());
      return { solEur: cache.solEur, usdcEur: cache.usdcEur, ts: cache.ts };
    }
    throw new Error('Price feed unavailable and cache is stale');
  }

  const data = await res.json();
  const solEur = data.solana?.eur;
  const usdcEur = data['usd-coin']?.eur;

  if (!solEur || !usdcEur) {
    throw new Error('Incomplete price data from CoinGecko');
  }

  cache = { solEur, usdcEur, ts: now };
  return { solEur, usdcEur, ts: now };
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
