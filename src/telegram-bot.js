'use strict';

const bus = require('./events');
const { getDb } = require('./db');

/**
 * PENGER Telegram Bot — Owner notification & order management.
 *
 * Environment:
 *   TELEGRAM_BOT_TOKEN  — BotFather token
 *   TELEGRAM_OWNER_ID   — Your Telegram user ID (numeric)
 *
 * Commands:
 *   /start        — Welcome message
 *   /orders       — Recent orders (last 10)
 *   /order <id>   — Order details by PG-XXXXX or UUID
 *   /stats        — Sales statistics
 *   /pending      — Pending/awaiting orders
 *   /help         — Command list
 */

let bot = null;
let TelegramBot = null;

function getOwnerId() {
  return process.env.TELEGRAM_OWNER_ID;
}

function isOwner(chatId) {
  return String(chatId) === String(getOwnerId());
}

/** Format EUR cents to readable string */
function fmtEur(cents) {
  return '€' + (cents / 100).toFixed(2);
}

/** Format timestamp to readable date */
function fmtDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });
}

/** Status emoji */
function statusEmoji(status) {
  const map = {
    quoted: '🔵',
    awaiting_payment: '🟡',
    confirming: '🟠',
    paid: '🟢',
    expired: '⚪',
    failed: '🔴',
    cancelled: '⛔',
  };
  return (map[status] || '❓') + ' ' + status;
}

/** Format invoice for Telegram message */
function formatInvoice(inv) {
  let orderInfo = '';
  try {
    const data = JSON.parse(inv.order_data || '{}');
    const parts = [];
    if (data.firstName || data.lastName) {
      parts.push(`👤 ${data.firstName || ''} ${data.lastName || ''}`.trim());
    }
    if (data.email) parts.push(`📧 ${data.email}`);
    if (data.phone) parts.push(`📱 ${data.phone}`);
    if (data.country) parts.push(`🌍 ${data.country}`);
    if (data.plates) parts.push(`📦 ${data.plates} plate(s)`);
    if (data.city) parts.push(`🏙 ${data.city}`);
    if (data.promoCode) parts.push(`🎟 Promo: ${data.promoCode}`);
    orderInfo = parts.join('\n');
  } catch (e) {
    orderInfo = '(no order data)';
  }

  const lines = [
    `📋 *Order ${inv.order_id}*`,
    `ID: \`${inv.id}\``,
    `Status: ${statusEmoji(inv.status)}`,
    `Amount: ${fmtEur(inv.amount_eur)}`,
    `Crypto: ${inv.amount_crypto} ${inv.asset}`,
    `Rate: ${inv.rate}`,
    `Created: ${fmtDate(inv.created_at)}`,
  ];

  if (inv.tx_signature) {
    lines.push(`TX: [${inv.tx_signature.slice(0, 16)}...](https://solscan.io/tx/${inv.tx_signature})`);
  }

  if (orderInfo) {
    lines.push('', '— *Customer* —', orderInfo);
  }

  return lines.join('\n');
}

/** Send message to owner */
async function notifyOwner(text, opts) {
  const ownerId = getOwnerId();
  if (!bot || !ownerId) return;
  try {
    await bot.sendMessage(ownerId, text, { parse_mode: 'Markdown', ...opts });
  } catch (err) {
    console.error('[telegram] Failed to notify owner:', err.message);
  }
}

/** Subscribe to event bus */
function subscribeToEvents() {
  bus.on('invoice:created', (invoice, orderData) => {
    let customerInfo = '';
    if (orderData) {
      const parts = [];
      if (orderData.firstName) parts.push(orderData.firstName);
      if (orderData.lastName) parts.push(orderData.lastName);
      if (orderData.email) parts.push(`📧 ${orderData.email}`);
      if (orderData.country) parts.push(`🌍 ${orderData.country}`);
      if (orderData.plates) parts.push(`📦 ${orderData.plates} plate(s)`);
      customerInfo = parts.join(' | ');
    }

    notifyOwner(
      `🆕 *New Order Created*\n\n` +
      `Order: *${invoice.orderId}*\n` +
      `Amount: ${fmtEur(invoice.amountEur)}\n` +
      `Crypto: ${invoice.amountCrypto} ${invoice.asset}\n` +
      (customerInfo ? `Customer: ${customerInfo}\n` : '') +
      `\nExpires: ${fmtDate(invoice.expiresAt)}`
    );
  });

  bus.on('invoice:paid', (invoice, txSignature) => {
    let customerName = '';
    try {
      const data = JSON.parse(invoice.order_data || '{}');
      customerName = [data.firstName, data.lastName].filter(Boolean).join(' ');
    } catch (e) { /* */ }

    notifyOwner(
      `💰 *Payment Confirmed!*\n\n` +
      `Order: *${invoice.order_id}*\n` +
      `Amount: ${fmtEur(invoice.amount_eur)}\n` +
      `Crypto: ${invoice.amount_crypto} ${invoice.asset}\n` +
      (customerName ? `Customer: ${customerName}\n` : '') +
      `TX: [View on Solscan](https://solscan.io/tx/${txSignature})`
    );
  });

  bus.on('invoice:status', (invoice, oldStatus, newStatus) => {
    // Only notify for meaningful transitions (not duplicating paid/created)
    if (newStatus === 'paid' || newStatus === 'quoted') return;

    if (newStatus === 'expired') {
      notifyOwner(
        `⏰ *Order Expired*\n\n` +
        `Order: *${invoice.order_id}*\n` +
        `Amount: ${fmtEur(invoice.amount_eur)} (${invoice.amount_crypto} ${invoice.asset})`
      );
      return;
    }

    if (newStatus === 'awaiting_payment') {
      notifyOwner(
        `👀 *Customer Scanning QR*\n\n` +
        `Order: *${invoice.order_id}*\n` +
        `Amount: ${fmtEur(invoice.amount_eur)} (${invoice.amount_crypto} ${invoice.asset})`
      );
    }
  });

  bus.on('contact:submitted', (data) => {
    notifyOwner(
      `📩 *New Contact Message*\n\n` +
      `From: ${data.name || '—'}\n` +
      `Email: ${data.email || '—'}\n` +
      `Message: ${(data.message || '').slice(0, 500)}`
    );
  });
}

/** Register bot commands */
function registerCommands() {
  if (!bot) return;

  bot.onText(/\/start/, (msg) => {
    if (!isOwner(msg.chat.id)) return;
    bot.sendMessage(msg.chat.id,
      '🐧 *PENGER Admin Bot*\n\n' +
      'Commands:\n' +
      '/orders — Recent orders\n' +
      '/order <id> — Order details\n' +
      '/stats — Sales statistics\n' +
      '/pending — Pending orders\n' +
      '/help — This message',
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/help/, (msg) => {
    if (!isOwner(msg.chat.id)) return;
    bot.sendMessage(msg.chat.id,
      '📋 *Commands*\n\n' +
      '/orders — Last 10 orders\n' +
      '/orders <N> — Last N orders\n' +
      '/order <PG-XXXXX> — Order by ID\n' +
      '/pending — Active orders\n' +
      '/stats — Revenue & conversion stats\n' +
      '/stats today — Today\'s stats\n' +
      '/stats week — This week\'s stats',
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/orders(?:\s+(\d+))?/, (msg, match) => {
    if (!isOwner(msg.chat.id)) return;
    const limit = Math.min(parseInt(match[1]) || 10, 50);

    try {
      const db = getDb();
      const invoices = db.prepare(
        'SELECT * FROM payment_invoices ORDER BY created_at DESC LIMIT ?'
      ).all(limit);

      if (invoices.length === 0) {
        return bot.sendMessage(msg.chat.id, 'No orders yet.');
      }

      const lines = invoices.map((inv, i) => {
        let name = '';
        try {
          const d = JSON.parse(inv.order_data || '{}');
          name = [d.firstName, d.lastName].filter(Boolean).join(' ');
        } catch (e) { /* */ }
        return `${i + 1}. ${statusEmoji(inv.status)} *${inv.order_id}* — ${fmtEur(inv.amount_eur)} ${inv.asset}${name ? ` (${name})` : ''} — ${fmtDate(inv.created_at)}`;
      });

      bot.sendMessage(msg.chat.id,
        `📋 *Last ${invoices.length} orders:*\n\n${lines.join('\n')}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      bot.sendMessage(msg.chat.id, '❌ Error: ' + err.message);
    }
  });

  bot.onText(/\/order\s+(.+)/, (msg, match) => {
    if (!isOwner(msg.chat.id)) return;
    const query = match[1].trim();

    try {
      const db = getDb();
      let inv = db.prepare('SELECT * FROM payment_invoices WHERE order_id = ?').get(query);
      if (!inv) {
        inv = db.prepare('SELECT * FROM payment_invoices WHERE id = ?').get(query);
      }
      if (!inv) {
        // Try partial match
        inv = db.prepare('SELECT * FROM payment_invoices WHERE order_id LIKE ?').get(`%${query}%`);
      }
      if (!inv) {
        return bot.sendMessage(msg.chat.id, `❌ Order "${query}" not found.`);
      }

      bot.sendMessage(msg.chat.id, formatInvoice(inv), { parse_mode: 'Markdown' });
    } catch (err) {
      bot.sendMessage(msg.chat.id, '❌ Error: ' + err.message);
    }
  });

  bot.onText(/\/pending/, (msg) => {
    if (!isOwner(msg.chat.id)) return;

    try {
      const db = getDb();
      const invoices = db.prepare(
        "SELECT * FROM payment_invoices WHERE status IN ('quoted', 'awaiting_payment', 'confirming') ORDER BY created_at DESC"
      ).all();

      if (invoices.length === 0) {
        return bot.sendMessage(msg.chat.id, '✅ No pending orders.');
      }

      const lines = invoices.map((inv) => {
        return `${statusEmoji(inv.status)} *${inv.order_id}* — ${fmtEur(inv.amount_eur)} ${inv.asset} — ${fmtDate(inv.created_at)}`;
      });

      bot.sendMessage(msg.chat.id,
        `⏳ *Pending orders (${invoices.length}):*\n\n${lines.join('\n')}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      bot.sendMessage(msg.chat.id, '❌ Error: ' + err.message);
    }
  });

  bot.onText(/\/stats(?:\s+(.+))?/, (msg, match) => {
    if (!isOwner(msg.chat.id)) return;
    const period = (match[1] || 'all').trim().toLowerCase();

    try {
      const db = getDb();
      let whereClause = '';
      let periodLabel = 'All Time';

      if (period === 'today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        whereClause = ` AND created_at >= ${todayStart.getTime()}`;
        periodLabel = 'Today';
      } else if (period === 'week') {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        whereClause = ` AND created_at >= ${weekAgo}`;
        periodLabel = 'Last 7 Days';
      } else if (period === 'month') {
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        whereClause = ` AND created_at >= ${monthAgo}`;
        periodLabel = 'Last 30 Days';
      }

      const total = db.prepare(
        `SELECT COUNT(*) as count FROM payment_invoices WHERE 1=1${whereClause}`
      ).get().count;

      const paid = db.prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount_eur), 0) as revenue FROM payment_invoices WHERE status = 'paid'${whereClause}`
      ).get();

      const expired = db.prepare(
        `SELECT COUNT(*) as count FROM payment_invoices WHERE status = 'expired'${whereClause}`
      ).get().count;

      const pending = db.prepare(
        `SELECT COUNT(*) as count FROM payment_invoices WHERE status IN ('quoted', 'awaiting_payment', 'confirming')${whereClause}`
      ).get().count;

      const conversionRate = total > 0 ? ((paid.count / total) * 100).toFixed(1) : '0.0';

      // Asset breakdown for paid orders
      const solPaid = db.prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount_eur), 0) as revenue FROM payment_invoices WHERE status = 'paid' AND asset = 'SOL'${whereClause}`
      ).get();
      const usdcPaid = db.prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount_eur), 0) as revenue FROM payment_invoices WHERE status = 'paid' AND asset = 'USDC'${whereClause}`
      ).get();

      bot.sendMessage(msg.chat.id,
        `📊 *PENGER Stats — ${periodLabel}*\n\n` +
        `Total orders: *${total}*\n` +
        `✅ Paid: *${paid.count}* (${fmtEur(paid.revenue)})\n` +
        `⏳ Pending: *${pending}*\n` +
        `⏰ Expired: *${expired}*\n` +
        `📈 Conversion: *${conversionRate}%*\n\n` +
        `— *By Asset* —\n` +
        `SOL: ${solPaid.count} orders (${fmtEur(solPaid.revenue)})\n` +
        `USDC: ${usdcPaid.count} orders (${fmtEur(usdcPaid.revenue)})`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      bot.sendMessage(msg.chat.id, '❌ Error: ' + err.message);
    }
  });

  // Fallback for unknown commands from owner
  bot.on('message', (msg) => {
    if (!isOwner(msg.chat.id)) return;
    if (msg.text && msg.text.startsWith('/') && !msg.text.match(/^\/(start|help|orders|order|pending|stats)/)) {
      bot.sendMessage(msg.chat.id, '❓ Unknown command. Use /help to see available commands.');
    }
  });
}

/** Start bot (only if token is configured) */
function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('[telegram] TELEGRAM_BOT_TOKEN not set — bot disabled');
    return null;
  }

  try {
    TelegramBot = require('node-telegram-bot-api');
  } catch (err) {
    console.error('[telegram] node-telegram-bot-api not installed. Run: npm install node-telegram-bot-api');
    return null;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.on('polling_error', (err) => {
    console.error('[telegram] Polling error:', err.message);
  });

  registerCommands();
  subscribeToEvents();

  console.log('[telegram] Bot started (polling mode)');
  console.log('[telegram] Owner ID:', getOwnerId() || 'NOT SET — set TELEGRAM_OWNER_ID');

  return bot;
}

function stopBot() {
  if (bot) {
    bot.stopPolling();
    bot = null;
  }
}

module.exports = { startBot, stopBot, notifyOwner };
