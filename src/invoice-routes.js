'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const { createInvoice, getInvoice, updateStatus } = require('./invoice');
const { handleTransactionRequest } = require('./solana-pay');
const { saveOrder } = require('./order-store');

const router = express.Router();

const invoiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a minute.' },
});

/**
 * POST /api/invoice — Create a new payment invoice
 * Body: { orderData: { plates, sleeveColor, punchTool, country, discount, order_id, ... }, asset: 'SOL'|'USDC' }
 */
router.post('/invoice', invoiceLimiter, async (req, res) => {
  try {
    const { orderData, asset } = req.body;
    if (!orderData || !asset) {
      return res.status(400).json({ error: 'orderData and asset are required' });
    }
    if (!['SOL', 'USDC'].includes(asset)) {
      return res.status(400).json({ error: 'Asset must be SOL or USDC' });
    }

    const invoice = await createInvoice(orderData, asset);

    // Persist order data to order-store so it's retrievable via /api/order/:id
    try {
      const orderId = invoice.orderId || orderData.order_id;
      if (orderId) {
        orderData.pay_method = 'crypto_solana';
        orderData.invoice_id = invoice.id;
        orderData.value = invoice.amountEur / 100;
        orderData.currency = 'EUR';
        orderData.ts = Date.now();
        saveOrder(orderId, orderData);
      }
    } catch (e) {
      console.warn('[invoice-routes] saveOrder failed:', e.message);
    }

    // Build Solana Pay transfer request URL (universally supported by wallets)
    let solanaPayUrl;
    if (asset === 'SOL') {
      solanaPayUrl = `solana:${invoice.recipient}?amount=${invoice.amountCrypto}&reference=${invoice.reference}&memo=${encodeURIComponent(invoice.memo)}&label=PENGER&message=${encodeURIComponent('PENGER order ' + invoice.orderId)}`;
    } else {
      solanaPayUrl = `solana:${invoice.recipient}?amount=${invoice.amountCrypto}&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&reference=${invoice.reference}&memo=${encodeURIComponent(invoice.memo)}&label=PENGER&message=${encodeURIComponent('PENGER order ' + invoice.orderId)}`;
    }

    // Transaction Request URL (for wallets that support server-mediated flow)
    const baseUrl = process.env.BASE_URL || ('http://localhost:' + (process.env.PORT || 3000));
    const payUrl = `solana:${baseUrl}/api/pay/${invoice.id}`;

    // QR encodes the direct transfer URL (more universally compatible)
    let qrDataUrl;
    try {
      qrDataUrl = await QRCode.toDataURL(solanaPayUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch (e) {
      qrDataUrl = null;
    }

    return res.json({
      id: invoice.id,
      orderId: invoice.orderId,
      status: invoice.status,
      asset: invoice.asset,
      amountEur: invoice.amountEur,
      amountCrypto: invoice.amountCrypto,
      rate: invoice.rate,
      reference: invoice.reference,
      recipient: invoice.recipient,
      expiresAt: invoice.expiresAt,
      qrDataUrl,
      payUrl,
      solanaPayUrl,
    });
  } catch (err) {
    console.error('[invoice] Create error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to create invoice' });
  }
});

/**
 * GET /api/invoice/:id — Poll invoice status
 */
router.get('/invoice/:id', (req, res) => {
  const invoice = getInvoice(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  return res.json({
    id: invoice.id,
    orderId: invoice.order_id,
    status: invoice.status,
    asset: invoice.asset,
    amountEur: invoice.amount_eur,
    amountCrypto: invoice.amount_crypto,
    rate: invoice.rate,
    expiresAt: invoice.expires_at,
    txSignature: invoice.tx_signature,
    recipient: invoice.recipient,
  });
});

/**
 * GET /api/pay/:id — Solana Pay Transaction Request metadata
 */
router.get('/pay/:id', (req, res) => {
  const invoice = getInvoice(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  // Transition to awaiting_payment if still quoted
  if (invoice.status === 'quoted') {
    try {
      updateStatus(invoice.id, 'awaiting_payment', { trigger: 'wallet_scan' });
    } catch (e) { /* already transitioned */ }
  }

  return res.json({
    label: 'PENGER',
    icon: 'https://mypenger.com/svg/e.svg',
  });
});

/**
 * POST /api/pay/:id — Solana Pay Transaction Request: build + return serialized tx
 * Body: { account: "<buyer wallet pubkey>" } (Solana Pay spec)
 */
router.post('/pay/:id', async (req, res) => {
  try {
    const invoice = getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (['paid', 'expired', 'cancelled', 'failed'].includes(invoice.status)) {
      return res.status(400).json({ error: 'Invoice is ' + invoice.status });
    }

    // Reject if quote has expired — prevents paying at stale rates
    if (invoice.expires_at && invoice.expires_at < Date.now()) {
      try { updateStatus(invoice.id, 'expired', { reason: 'quote_expired_at_tx' }); } catch (e) { /* already */ }
      return res.status(400).json({ error: 'Quote expired. Please get a new quote.' });
    }

    const buyerAccount = req.body.account;
    if (!buyerAccount) {
      return res.status(400).json({ error: 'account (buyer wallet pubkey) is required' });
    }
    // Validate base58 Solana address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(buyerAccount)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Transition to awaiting_payment
    if (invoice.status === 'quoted') {
      try {
        updateStatus(invoice.id, 'awaiting_payment', { trigger: 'tx_request', buyer: buyerAccount });
      } catch (e) { /* already transitioned */ }
    }

    const result = await handleTransactionRequest(invoice, buyerAccount);

    return res.json({
      transaction: result.transaction,
      lastValidBlockHeight: result.lastValidBlockHeight,
      message: 'PENGER order ' + invoice.order_id,
    });
  } catch (err) {
    console.error('[pay] Transaction request error:', err.message);
    return res.status(500).json({ error: 'Failed to build transaction' });
  }
});

module.exports = router;
