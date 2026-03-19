'use strict';

const { randomUUID } = require('crypto');
const { Keypair } = require('@solana/web3.js');
const { getDb } = require('./db');
const { getQuote } = require('./prices');

/* ===== PRICING (server-side source of truth, mirrors order.js) ===== */
const BASE_PRICE = 4900;   // cents
const EXTRA_PLATE = 3500;  // cents
const SLEEVE_PRICE = 1000; // cents (always included)
const PUNCH_PRICE = 1000;  // cents

const SHIPPING_FREE = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
  'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'
]);
const SHIPPING_COST = { GB: 500, CH: 500, NO: 500, US: 900, CA: 900, AU: 1200, JP: 1200, UA: 700 };
const SHIPPING_DEFAULT = 1500;

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

/* Valid state transitions */
const TRANSITIONS = {
  quoted:            ['awaiting_payment', 'expired', 'cancelled'],
  awaiting_payment:  ['confirming', 'expired', 'failed', 'cancelled'],
  confirming:        ['paid', 'failed'],
  paid:              [],
  expired:           [],
  failed:            [],
  cancelled:         [],
};

function calcEurTotal(orderData) {
  const plates = Math.max(1, Math.min(4, parseInt(orderData.plates) || 1));
  let sub = BASE_PRICE + ((plates - 1) * EXTRA_PLATE);
  sub += SLEEVE_PRICE;
  if (orderData.punchTool) sub += PUNCH_PRICE;

  const country = orderData.country || '';
  let shipping = 0;
  if (country) {
    if (SHIPPING_FREE.has(country)) {
      shipping = 0;
    } else {
      shipping = SHIPPING_COST[country] || SHIPPING_DEFAULT;
    }
  }

  // Discount arrives from client in EUR (not cents); convert to cents
  const discountEur = Math.max(0, parseFloat(orderData.discount) || 0);
  const discountCents = Math.round(discountEur * 100);
  const total = Math.max(sub + shipping - discountCents, 0);
  return total;
}

async function createInvoice(orderData, asset) {
  if (!['SOL', 'USDC'].includes(asset)) {
    throw new Error('Asset must be SOL or USDC');
  }

  const eurCents = calcEurTotal(orderData);
  if (eurCents <= 0) throw new Error('Invalid order total');

  const quote = await getQuote(eurCents, asset);
  const reference = Keypair.generate().publicKey.toBase58();
  const id = randomUUID();
  const orderId = orderData.order_id || ('PG-' + Date.now().toString(36).toUpperCase());
  const memo = 'invoice:' + id.slice(0, 8);

  const merchantWallet = process.env.MERCHANT_WALLET;
  if (!merchantWallet) throw new Error('MERCHANT_WALLET not configured');
  const merchantUsdcAta = process.env.MERCHANT_USDC_ATA || null;

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO payment_invoices
      (id, order_id, status, amount_eur, asset, amount_crypto, amount_raw, rate,
       recipient, recipient_ata, reference, memo, mint_address, token_program,
       order_data, expires_at)
    VALUES
      (@id, @orderId, 'quoted', @amountEur, @asset, @cryptoAmount, @amountRaw, @rate,
       @recipient, @recipientAta, @reference, @memo, @mintAddress, @tokenProgram,
       @orderData, @expiresAt)
  `);

  stmt.run({
    id,
    orderId,
    amountEur: eurCents,
    asset,
    cryptoAmount: quote.cryptoAmount,
    amountRaw: quote.amountRaw,
    rate: quote.rate,
    recipient: merchantWallet,
    recipientAta: asset === 'USDC' ? merchantUsdcAta : null,
    reference,
    memo,
    mintAddress: asset === 'USDC' ? USDC_MINT : null,
    tokenProgram: asset === 'USDC' ? TOKEN_PROGRAM : null,
    orderData: JSON.stringify(orderData),
    expiresAt: quote.expiresAt,
  });

  logEvent(id, 'created', { asset, eurCents, rate: quote.rate, cryptoAmount: quote.cryptoAmount });

  return {
    id,
    orderId,
    status: 'quoted',
    asset,
    amountEur: eurCents,
    amountCrypto: quote.cryptoAmount,
    amountRaw: quote.amountRaw,
    rate: quote.rate,
    reference,
    memo,
    recipient: merchantWallet,
    recipientAta: asset === 'USDC' ? merchantUsdcAta : null,
    expiresAt: quote.expiresAt,
  };
}

function getInvoice(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM payment_invoices WHERE id = ?').get(id) || null;
}

function updateStatus(id, newStatus, eventData) {
  const db = getDb();
  const invoice = db.prepare('SELECT status FROM payment_invoices WHERE id = ?').get(id);
  if (!invoice) throw new Error('Invoice not found: ' + id);

  const allowed = TRANSITIONS[invoice.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(`Invalid transition: ${invoice.status} -> ${newStatus}`);
  }

  db.prepare('UPDATE payment_invoices SET status = ?, updated_at = ? WHERE id = ?')
    .run(newStatus, Date.now(), id);

  logEvent(id, newStatus, eventData || {});
  return true;
}

function updateInvoiceField(id, field, value) {
  const ALLOWED = ['payer_wallet', 'tx_signature', 'tx_slot', 'tx_block_time'];
  if (!ALLOWED.includes(field)) throw new Error('Field not allowed: ' + field);
  const db = getDb();
  db.prepare(`UPDATE payment_invoices SET ${field} = ?, updated_at = ? WHERE id = ?`)
    .run(value, Date.now(), id);
}

function getAwaitingInvoices() {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM payment_invoices WHERE status IN ('quoted', 'awaiting_payment', 'confirming')"
  ).all();
}

function expireStaleInvoices() {
  const db = getDb();
  const now = Date.now();
  const stale = db.prepare(
    "SELECT id FROM payment_invoices WHERE status IN ('quoted', 'awaiting_payment') AND expires_at < ?"
  ).all(now);

  for (const inv of stale) {
    try {
      updateStatus(inv.id, 'expired', { reason: 'quote_expired' });
    } catch (e) {
      // Already transitioned
    }
  }
  return stale.length;
}

function logEvent(invoiceId, event, data) {
  const db = getDb();
  db.prepare('INSERT INTO payment_events (invoice_id, event, data) VALUES (?, ?, ?)')
    .run(invoiceId, event, JSON.stringify(data || {}));
}

module.exports = {
  createInvoice,
  getInvoice,
  updateStatus,
  updateInvoiceField,
  getAwaitingInvoices,
  expireStaleInvoices,
  logEvent,
  USDC_MINT,
  TOKEN_PROGRAM,
};
