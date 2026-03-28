'use strict';

/* ===== Promo & referral code definitions (single source of truth) ===== */

const PROMO_CODES = {
  'PENGER10': { type: 'percent', value: 10, expires: null, maxUses: null, isReferral: false },
  '99':       { type: 'percent', value: 99, expires: null, maxUses: null, isReferral: false },
};

const REFERRAL_CODES = {
  'CRAFT2026': { type: 'percent', value: 20, expires: null, maxUses: null, isReferral: true },
};

const ALL_CODES = Object.assign({}, PROMO_CODES, REFERRAL_CODES);

/**
 * Look up a promo/referral code definition.
 */
function getPromo(code) {
  if (!code) return null;
  return ALL_CODES[String(code).trim().toUpperCase()] || null;
}

/**
 * Internal: calculate discount in cents from a promo definition.
 */
function _calcDiscount(promo, subtotalCents) {
  let d;
  if (promo.type === 'percent') {
    d = Math.round(subtotalCents * promo.value / 100);
  } else {
    d = promo.value;
  }
  return Math.min(d, subtotalCents);
}

/**
 * Full server-side promo code validation.
 * @param {string} code
 * @param {number} subtotalCents — product subtotal in cents (before shipping)
 * @returns {{ valid: boolean, error?: string, type?: string, value?: number, discount?: number, isReferral?: boolean }}
 */
function validatePromo(code, subtotalCents) {
  if (!code) return { valid: false, error: 'No code provided' };
  code = String(code).trim().toUpperCase();

  if (code.length < 2 || code.length > 30 || !/^[A-Z0-9_-]+$/.test(code)) {
    return { valid: false, error: 'Invalid promo code' };
  }

  const promo = ALL_CODES[code];
  if (!promo) return { valid: false, error: 'Invalid promo code' };

  if (promo.expires && Date.now() > new Date(promo.expires).getTime()) {
    return { valid: false, error: 'This promo code has expired' };
  }

  if (promo.maxUses !== null) {
    const used = getUsageCount(code);
    if (used >= promo.maxUses) {
      return { valid: false, error: 'This promo code is no longer available' };
    }
  }

  return {
    valid: true,
    type: promo.type,
    value: promo.value,
    discount: _calcDiscount(promo, subtotalCents),
    isReferral: !!promo.isReferral,
  };
}

/**
 * Calculate discount in cents from a promo code string.
 * Used by calcEurTotal — replaces the client-sent discount field.
 */
function calcPromoDiscount(promoCode, subtotalCents) {
  if (!promoCode) return 0;
  const promo = getPromo(promoCode);
  if (!promo) return 0;
  if (promo.expires && Date.now() > new Date(promo.expires).getTime()) return 0;
  return _calcDiscount(promo, subtotalCents);
}

/**
 * Get persisted usage count from SQLite.
 */
function getUsageCount(code) {
  try {
    const { getDb } = require('./db');
    const db = getDb();
    const row = db.prepare('SELECT count FROM promo_usage WHERE code = ?').get(code);
    return row ? row.count : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Increment usage count in SQLite (persistent across restarts).
 */
function incrementUsage(code) {
  if (!code) return;
  code = String(code).trim().toUpperCase();
  if (!ALL_CODES[code]) return;
  try {
    const { getDb } = require('./db');
    const db = getDb();
    const existing = db.prepare('SELECT count FROM promo_usage WHERE code = ?').get(code);
    if (existing) {
      db.prepare('UPDATE promo_usage SET count = count + 1, updated_at = ? WHERE code = ?')
        .run(Date.now(), code);
    } else {
      db.prepare('INSERT INTO promo_usage (code, count, updated_at) VALUES (?, 1, ?)')
        .run(code, Date.now());
    }
  } catch (e) {
    console.warn('[promo] incrementUsage failed:', e.message);
  }
}

module.exports = {
  ALL_CODES,
  PROMO_CODES,
  REFERRAL_CODES,
  getPromo,
  validatePromo,
  calcPromoDiscount,
  getUsageCount,
  incrementUsage,
};
