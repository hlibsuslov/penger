'use strict';

const { randomUUID } = require('crypto');
const { Keypair, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { getDb } = require('./db');
const { getQuote } = require('./prices');
const { calcPromoDiscount } = require('./promo');
const bus = require('./events');

/* ===== PRICING (server-side source of truth, mirrors order.js) ===== */
const BASE_PRICE = 5900;   // cents
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

  // Server-side promo discount — ignore client-sent discount value (S1 fix)
  const discountCents = calcPromoDiscount(orderData.promo, sub);
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

  // Auto-derive USDC ATA if not explicitly set
  let merchantUsdcAta = process.env.MERCHANT_USDC_ATA || null;
  if (!merchantUsdcAta && asset === 'USDC') {
    const usdcMint = new PublicKey(USDC_MINT);
    const merchantPub = new PublicKey(merchantWallet);
    merchantUsdcAta = (await getAssociatedTokenAddress(usdcMint, merchantPub, false, TOKEN_PROGRAM_ID)).toBase58();
  }

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

  const result = {
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

  bus.emit('invoice:created', result, orderData);

  return result;
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

  const oldStatus = invoice.status;

  db.prepare('UPDATE payment_invoices SET status = ?, updated_at = ? WHERE id = ?')
    .run(newStatus, Date.now(), id);

  logEvent(id, newStatus, eventData || {});

  // Emit status change event
  const fullInvoice = db.prepare('SELECT * FROM payment_invoices WHERE id = ?').get(id);
  bus.emit('invoice:status', fullInvoice, oldStatus, newStatus);

  if (newStatus === 'paid') {
    bus.emit('invoice:paid', fullInvoice, fullInvoice.tx_signature);
  }

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

function getActiveInvoiceByOrderId(orderId, asset) {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM payment_invoices WHERE order_id = ? AND asset = ? AND status IN ('quoted', 'awaiting_payment') AND expires_at > ?"
  ).get(orderId, asset, Date.now()) || null;
}

module.exports = {
  createInvoice,
  getInvoice,
  getActiveInvoiceByOrderId,
  calcEurTotal,
  updateStatus,
  updateInvoiceField,
  getAwaitingInvoices,
  expireStaleInvoices,
  logEvent,
  USDC_MINT,
  TOKEN_PROGRAM,
};
