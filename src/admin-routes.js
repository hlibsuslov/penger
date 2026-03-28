'use strict';

const express = require('express');
const { getDb } = require('./db');

const router = express.Router();

/**
 * Admin API — protected by ADMIN_API_KEY header.
 *
 * Environment:
 *   ADMIN_API_KEY — Secret key for admin endpoints
 *
 * Endpoints:
 *   GET  /admin/orders         — List orders (with filters)
 *   GET  /admin/orders/:id     — Order details + events
 *   GET  /admin/stats          — Aggregated statistics
 *   GET  /admin/export         — Export orders as JSON
 */

/** Auth middleware */
function authMiddleware(req, res, next) {
  const apiKey = process.env.ADMIN_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Admin API not configured (set ADMIN_API_KEY)' });
  }
  const provided = req.headers['x-admin-key'];
  if (provided !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(authMiddleware);

/**
 * GET /admin/orders
 * Query params:
 *   status   — filter by status (comma-separated)
 *   limit    — max results (default 50)
 *   offset   — pagination offset
 *   from     — created_at >= (ISO date or unix ms)
 *   to       — created_at <= (ISO date or unix ms)
 *   search   — search in order_id, email, name
 *   asset    — filter by SOL or USDC
 */
router.get('/orders', (req, res) => {
  try {
    const db = getDb();
    const conditions = [];
    const params = [];

    if (req.query.status) {
      const statuses = req.query.status.split(',').map(s => s.trim());
      conditions.push(`status IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }

    if (req.query.asset) {
      conditions.push('asset = ?');
      params.push(req.query.asset.toUpperCase());
    }

    if (req.query.from) {
      const from = isNaN(req.query.from) ? new Date(req.query.from).getTime() : Number(req.query.from);
      conditions.push('created_at >= ?');
      params.push(from);
    }

    if (req.query.to) {
      const to = isNaN(req.query.to) ? new Date(req.query.to).getTime() : Number(req.query.to);
      conditions.push('created_at <= ?');
      params.push(to);
    }

    if (req.query.search) {
      const q = `%${req.query.search}%`;
      conditions.push('(order_id LIKE ? OR order_data LIKE ?)');
      params.push(q, q);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const total = db.prepare(`SELECT COUNT(*) as count FROM payment_invoices ${where}`).get(...params).count;
    const orders = db.prepare(
      `SELECT * FROM payment_invoices ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    // Parse order_data JSON for each order
    const enriched = orders.map(inv => {
      let customerData = {};
      try { customerData = JSON.parse(inv.order_data || '{}'); } catch (e) { /* */ }
      return {
        id: inv.id,
        orderId: inv.order_id,
        status: inv.status,
        amountEur: inv.amount_eur,
        amountEurFormatted: '€' + (inv.amount_eur / 100).toFixed(2),
        asset: inv.asset,
        amountCrypto: inv.amount_crypto,
        rate: inv.rate,
        txSignature: inv.tx_signature,
        txBlockTime: inv.tx_block_time,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
        expiresAt: inv.expires_at,
        customer: {
          firstName: customerData.firstName || null,
          lastName: customerData.lastName || null,
          email: customerData.email || null,
          phone: customerData.phone || null,
          country: customerData.country || null,
          city: customerData.city || null,
        },
        plates: customerData.plates || 1,
        promoCode: customerData.promoCode || null,
      };
    });

    return res.json({ total, limit, offset, orders: enriched });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/orders/:id — Full order details with event log
 */
router.get('/orders/:id', (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;

    let inv = db.prepare('SELECT * FROM payment_invoices WHERE id = ?').get(id);
    if (!inv) {
      inv = db.prepare('SELECT * FROM payment_invoices WHERE order_id = ?').get(id);
    }
    if (!inv) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const events = db.prepare(
      'SELECT * FROM payment_events WHERE invoice_id = ? ORDER BY created_at ASC'
    ).all(inv.id);

    let customerData = {};
    try { customerData = JSON.parse(inv.order_data || '{}'); } catch (e) { /* */ }

    return res.json({
      order: {
        ...inv,
        order_data: customerData,
      },
      events: events.map(e => ({
        event: e.event,
        data: (() => { try { return JSON.parse(e.data || '{}'); } catch { return {}; } })(),
        createdAt: e.created_at,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/stats
 * Query: period=today|week|month|all (default: all)
 */
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const period = req.query.period || 'all';

    let whereClause = '';
    if (period === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      whereClause = ` AND created_at >= ${start.getTime()}`;
    } else if (period === 'week') {
      whereClause = ` AND created_at >= ${Date.now() - 7 * 86400000}`;
    } else if (period === 'month') {
      whereClause = ` AND created_at >= ${Date.now() - 30 * 86400000}`;
    }

    const total = db.prepare(`SELECT COUNT(*) as c FROM payment_invoices WHERE 1=1${whereClause}`).get().c;
    const paid = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(amount_eur), 0) as rev FROM payment_invoices WHERE status='paid'${whereClause}`).get();
    const expired = db.prepare(`SELECT COUNT(*) as c FROM payment_invoices WHERE status='expired'${whereClause}`).get().c;
    const pending = db.prepare(`SELECT COUNT(*) as c FROM payment_invoices WHERE status IN ('quoted','awaiting_payment','confirming')${whereClause}`).get().c;
    const failed = db.prepare(`SELECT COUNT(*) as c FROM payment_invoices WHERE status='failed'${whereClause}`).get().c;

    const solStats = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(amount_eur), 0) as rev FROM payment_invoices WHERE status='paid' AND asset='SOL'${whereClause}`).get();
    const usdcStats = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(amount_eur), 0) as rev FROM payment_invoices WHERE status='paid' AND asset='USDC'${whereClause}`).get();

    // Daily breakdown (last 7 days)
    const dailyBreakdown = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

      const dayData = db.prepare(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid,
                SUM(CASE WHEN status='paid' THEN amount_eur ELSE 0 END) as revenue
         FROM payment_invoices
         WHERE created_at >= ? AND created_at < ?`
      ).get(dayStart.getTime(), dayEnd.getTime());

      dailyBreakdown.push({
        date: dayStart.toISOString().slice(0, 10),
        total: dayData.total,
        paid: dayData.paid || 0,
        revenue: dayData.revenue || 0,
      });
    }

    return res.json({
      period,
      total,
      paid: { count: paid.c, revenue: paid.rev, revenueFormatted: '€' + (paid.rev / 100).toFixed(2) },
      pending,
      expired,
      failed,
      conversionRate: total > 0 ? ((paid.c / total) * 100).toFixed(1) + '%' : '0%',
      byAsset: {
        SOL: { count: solStats.c, revenue: solStats.rev },
        USDC: { count: usdcStats.c, revenue: usdcStats.rev },
      },
      dailyBreakdown,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/export — Export all paid orders as JSON (for CRM import)
 * Query: status=paid (default), format=json
 */
router.get('/export', (req, res) => {
  try {
    const db = getDb();
    const status = req.query.status || 'paid';

    const orders = db.prepare(
      'SELECT * FROM payment_invoices WHERE status = ? ORDER BY created_at DESC'
    ).all(status);

    const exportData = orders.map(inv => {
      let customer = {};
      try { customer = JSON.parse(inv.order_data || '{}'); } catch (e) { /* */ }

      return {
        orderId: inv.order_id,
        status: inv.status,
        amountEur: (inv.amount_eur / 100).toFixed(2),
        asset: inv.asset,
        amountCrypto: inv.amount_crypto,
        txSignature: inv.tx_signature,
        createdAt: new Date(inv.created_at).toISOString(),
        paidAt: inv.tx_block_time ? new Date(inv.tx_block_time).toISOString() : null,
        customer,
      };
    });

    if (req.query.format === 'csv') {
      const header = 'Order ID,Status,Amount EUR,Asset,Crypto Amount,TX,Created,Paid,Name,Email,Country\n';
      const rows = exportData.map(o =>
        `${o.orderId},${o.status},${o.amountEur},${o.asset},${o.amountCrypto},${o.txSignature || ''},${o.createdAt},${o.paidAt || ''},"${(o.customer.firstName || '') + ' ' + (o.customer.lastName || '')}",${o.customer.email || ''},${o.customer.country || ''}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="penger-orders-${status}-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send(header + rows);
    }

    return res.json({ count: exportData.length, orders: exportData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
