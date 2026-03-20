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
 *   /paid         — Recent paid orders
 *   /search <q>   — Search by name/email/city
 *   /events <id>  — Event log for an order
 *   /help         — Command list
 */

let bot = null;
let TelegramBot = null;

const SLEEVE_NAMES = {
  black: 'Black', blue: 'Blue', coffee: 'Coffee', ocean: 'Ocean', red: 'Red',
};

const COUNTRY_NAMES = {
  AT:'Austria',BE:'Belgium',BG:'Bulgaria',HR:'Croatia',CY:'Cyprus',CZ:'Czechia',
  DK:'Denmark',EE:'Estonia',FI:'Finland',FR:'France',DE:'Germany',GR:'Greece',
  HU:'Hungary',IE:'Ireland',IT:'Italy',LV:'Latvia',LT:'Lithuania',LU:'Luxembourg',
  MT:'Malta',NL:'Netherlands',PL:'Poland',PT:'Portugal',RO:'Romania',SK:'Slovakia',
  SI:'Slovenia',ES:'Spain',SE:'Sweden',GB:'United Kingdom',CH:'Switzerland',
  NO:'Norway',US:'United States',CA:'Canada',AU:'Australia',JP:'Japan',UA:'Ukraine',
};

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

/** Country code → flag emoji */
function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(
    0x1F1E6 + code.charCodeAt(0) - 65,
    0x1F1E6 + code.charCodeAt(1) - 65
  );
}

/** Status emoji */
function statusEmoji(status) {
  const map = {
    quoted: '🔵 Quoted',
    awaiting_payment: '🟡 Awaiting Payment',
    confirming: '🟠 Confirming',
    paid: '🟢 Paid',
    expired: '⚪ Expired',
    failed: '🔴 Failed',
    cancelled: '⛔ Cancelled',
  };
  return map[status] || ('❓ ' + status);
}

/**
 * Extract customer/order info from order_data JSON.
 * Handles both nested (contact/address) and flat field formats.
 */
function parseOrderData(raw) {
  let d;
  try { d = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {}); } catch (e) { return null; }

  const contact = d.contact || {};
  const address = d.address || {};

  return {
    firstName:    contact.firstName || d.firstName || null,
    lastName:     contact.lastName  || d.lastName  || null,
    email:        contact.email     || d.email     || null,
    phone:        contact.phone     || d.phone     || null,
    street:       address.street    || d.street    || null,
    apt:          address.apt       || d.apt       || null,
    city:         address.city      || d.city      || null,
    zip:          address.zip       || d.zip       || null,
    country:      address.country   || d.country   || null,
    plates:       parseInt(d.plates) || 1,
    sleeveColors: d.sleeveColors    || [],
    punchTool:    d.punchTool != null ? d.punchTool : null,
    payMethod:    d.pay_method      || d.payMethod || null,
    shipping:     d.shipping != null ? d.shipping  : null,
    discount:     d.discount        || 0,
    promo:        d.promo           || d.promoCode || null,
    referral:     d.referral        || null,
    newsletter:   d.newsletter      || false,
    value:        d.value           || null,
    productId:    d.product_id      || null,
    solanaTx:     d.solana_tx       || null,
    orderId:      d.order_id        || null,
    ts:           d.ts              || null,
  };
}

/** Full name helper */
function fullName(data) {
  if (!data) return '';
  return [data.firstName, data.lastName].filter(Boolean).join(' ');
}

/** Format sleeve colors for display */
function fmtSleeves(colors) {
  if (!colors || colors.length === 0) return '—';
  return colors.map((c, i) => `${i + 1}: ${SLEEVE_NAMES[c] || c}`).join(', ');
}

/** Full address string */
function fmtAddress(data) {
  if (!data) return '—';
  const parts = [];
  if (data.street) parts.push(data.street);
  if (data.apt) parts.push('apt ' + data.apt);
  if (data.zip && data.city) parts.push(`${data.zip} ${data.city}`);
  else if (data.city) parts.push(data.city);
  else if (data.zip) parts.push(data.zip);
  if (data.country) {
    const flag = countryFlag(data.country);
    const name = COUNTRY_NAMES[data.country] || data.country;
    parts.push(`${flag} ${name}`);
  }
  return parts.join(', ') || '—';
}

/** Time elapsed since creation */
function timeAgo(ms) {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h ago`;
}

/** Format full invoice details for /order command — maximum info */
function formatInvoiceFull(inv) {
  const data = parseOrderData(inv.order_data);
  const name = fullName(data);

  const lines = [
    `📋 *Order ${inv.order_id}*`,
    ``,
    `*— Status —*`,
    `${statusEmoji(inv.status)}`,
    `Created: ${fmtDate(inv.created_at)} (${timeAgo(inv.created_at)})`,
    `Updated: ${fmtDate(inv.updated_at)}`,
  ];

  if (inv.expires_at && ['quoted', 'awaiting_payment'].includes(inv.status)) {
    const remaining = inv.expires_at - Date.now();
    if (remaining > 0) {
      lines.push(`⏳ Expires in: ${Math.ceil(remaining / 60000)} min`);
    } else {
      lines.push(`⏳ Expired: ${fmtDate(inv.expires_at)}`);
    }
  }

  lines.push(
    ``,
    `*— Payment —*`,
    `Amount: *${fmtEur(inv.amount_eur)}*`,
    `Crypto: *${inv.amount_crypto} ${inv.asset}*`,
    `Rate: 1 ${inv.asset} = €${parseFloat(inv.rate).toFixed(2)}`,
    `Raw amount: ${inv.amount_raw} ${inv.asset === 'SOL' ? 'lamports' : 'units'}`,
  );

  if (inv.tx_signature) {
    lines.push(`TX: [${inv.tx_signature.slice(0, 20)}…](https://solscan.io/tx/${inv.tx_signature})`);
  }
  if (inv.tx_block_time) {
    lines.push(`Confirmed: ${fmtDate(inv.tx_block_time)}`);
  }
  if (inv.payer_wallet) {
    lines.push(`Payer wallet: \`${inv.payer_wallet}\``);
  }

  lines.push(`Recipient: \`${inv.recipient}\``);
  if (inv.recipient_ata) {
    lines.push(`USDC ATA: \`${inv.recipient_ata}\``);
  }
  lines.push(`Reference: \`${inv.reference}\``);
  if (inv.memo) lines.push(`Memo: ${inv.memo}`);

  if (data) {
    lines.push(
      ``,
      `*— Customer —*`,
    );
    if (name) lines.push(`👤 ${name}`);
    if (data.email) lines.push(`📧 ${data.email}`);
    if (data.phone) lines.push(`📱 ${data.phone}`);

    lines.push(
      ``,
      `*— Delivery Address —*`,
      `📍 ${fmtAddress(data)}`,
    );

    lines.push(
      ``,
      `*— Product —*`,
      `📦 Plates: ${data.plates}`,
      `🎨 Sleeves: ${fmtSleeves(data.sleeveColors)}`,
      `🔨 Punch tool: ${data.punchTool ? 'Yes (+€10)' : 'No'}`,
    );

    if (data.shipping != null && data.shipping > 0) {
      lines.push(`🚚 Shipping: €${data.shipping}`);
    } else if (data.shipping === 0) {
      lines.push(`🚚 Shipping: Free`);
    }

    if (data.discount > 0) {
      lines.push(`🏷 Discount: -€${data.discount}`);
    }
    if (data.promo) {
      lines.push(`🎟 Promo code: ${data.promo}`);
    }
    if (data.referral) {
      lines.push(`🤝 Referral: ${data.referral}`);
    }
    if (data.newsletter) {
      lines.push(`📬 Newsletter: Yes`);
    }
    if (data.payMethod) {
      lines.push(`💳 Pay method: ${data.payMethod}`);
    }
  }

  lines.push(``, `ID: \`${inv.id}\``);

  return lines.join('\n');
}

/** Short format for order lists */
function formatInvoiceShort(inv, index) {
  const data = parseOrderData(inv.order_data);
  const name = fullName(data);
  const country = data && data.country ? (' ' + countryFlag(data.country)) : '';
  const plates = data ? ` ${data.plates}×🔳` : '';

  return `${index}. ${statusEmoji(inv.status)}\n` +
    `   *${inv.order_id}* — *${fmtEur(inv.amount_eur)}* ${inv.asset}${plates}${country}\n` +
    `   ${name || '—'}${data && data.email ? ' · ' + data.email : ''}\n` +
    `   ${fmtDate(inv.created_at)} (${timeAgo(inv.created_at)})`;
}

/** Send message to owner */
async function notifyOwner(text, opts) {
  const ownerId = getOwnerId();
  if (!bot || !ownerId) return;
  try {
    await bot.sendMessage(ownerId, text, { parse_mode: 'Markdown', disable_web_page_preview: true, ...opts });
  } catch (err) {
    console.error('[telegram] Failed to notify owner:', err.message);
  }
}

/** Subscribe to event bus */
function subscribeToEvents() {

  bus.on('invoice:created', (invoice, orderData) => {
    const data = parseOrderData(orderData);
    const name = fullName(data);
    const country = data && data.country ? (countryFlag(data.country) + ' ' + (COUNTRY_NAMES[data.country] || data.country)) : '';

    const lines = [
      `🆕 *New Order Created*`,
      ``,
      `Order: *${invoice.orderId}*`,
      `Amount: *${fmtEur(invoice.amountEur)}*`,
      `Crypto: *${invoice.amountCrypto} ${invoice.asset}*`,
      `Rate: 1 ${invoice.asset} = €${parseFloat(invoice.rate).toFixed(2)}`,
    ];

    if (data) {
      lines.push(``);
      if (name) lines.push(`👤 ${name}`);
      if (data.email) lines.push(`📧 ${data.email}`);
      if (data.phone) lines.push(`📱 ${data.phone}`);
      if (country) lines.push(`🌍 ${country}`);
      if (data.city) lines.push(`🏙 ${data.city}`);
      lines.push(``);
      lines.push(`📦 ${data.plates} plate(s) · Sleeves: ${fmtSleeves(data.sleeveColors)}`);
      if (data.punchTool) lines.push(`🔨 Punch tool: Yes`);
      if (data.shipping != null) lines.push(`🚚 Shipping: ${data.shipping > 0 ? '€' + data.shipping : 'Free'}`);
      if (data.discount > 0) lines.push(`🏷 Discount: -€${data.discount}`);
      if (data.promo) lines.push(`🎟 Promo: ${data.promo}`);
      if (data.referral) lines.push(`🤝 Referral: ${data.referral}`);
    }

    lines.push(``, `⏳ Expires: ${fmtDate(invoice.expiresAt)}`);

    notifyOwner(lines.join('\n'));
  });

  bus.on('invoice:paid', (invoice, txSignature) => {
    const data = parseOrderData(invoice.order_data);
    const name = fullName(data);
    const country = data && data.country ? (countryFlag(data.country) + ' ' + (COUNTRY_NAMES[data.country] || data.country)) : '';

    const lines = [
      `💰 *Payment Confirmed!*`,
      ``,
      `Order: *${invoice.order_id}*`,
      `Amount: *${fmtEur(invoice.amount_eur)}*`,
      `Crypto: *${invoice.amount_crypto} ${invoice.asset}*`,
    ];

    if (data) {
      lines.push(``);
      if (name) lines.push(`👤 ${name}`);
      if (data.email) lines.push(`📧 ${data.email}`);
      if (data.phone) lines.push(`📱 ${data.phone}`);
      if (country) lines.push(`🌍 ${country}`);
      lines.push(``);
      lines.push(`📍 ${fmtAddress(data)}`);
      lines.push(`📦 ${data.plates} plate(s) · Sleeves: ${fmtSleeves(data.sleeveColors)}`);
      if (data.punchTool) lines.push(`🔨 Punch tool: Yes`);
    }

    if (txSignature) {
      lines.push(``, `🔗 [View TX on Solscan](https://solscan.io/tx/${txSignature})`);
    }

    notifyOwner(lines.join('\n'));
  });

  bus.on('invoice:status', (invoice, oldStatus, newStatus) => {
    // Don't duplicate paid/created
    if (newStatus === 'paid' || newStatus === 'quoted') return;

    const data = parseOrderData(invoice.order_data);
    const name = fullName(data);

    if (newStatus === 'expired') {
      notifyOwner(
        `⏰ *Order Expired*\n\n` +
        `Order: *${invoice.order_id}*\n` +
        `Amount: ${fmtEur(invoice.amount_eur)} (${invoice.amount_crypto} ${invoice.asset})\n` +
        (name ? `👤 ${name}\n` : '') +
        (data && data.email ? `📧 ${data.email}\n` : '') +
        `Created: ${fmtDate(invoice.created_at)}`
      );
      return;
    }

    if (newStatus === 'awaiting_payment') {
      notifyOwner(
        `👀 *Customer Scanning QR*\n\n` +
        `Order: *${invoice.order_id}*\n` +
        `Amount: ${fmtEur(invoice.amount_eur)} (${invoice.amount_crypto} ${invoice.asset})\n` +
        (name ? `👤 ${name}\n` : '') +
        (data && data.email ? `📧 ${data.email}` : '')
      );
      return;
    }

    if (newStatus === 'confirming') {
      notifyOwner(
        `🔄 *Transaction Detected — Confirming*\n\n` +
        `Order: *${invoice.order_id}*\n` +
        `Amount: ${fmtEur(invoice.amount_eur)} (${invoice.amount_crypto} ${invoice.asset})\n` +
        (name ? `👤 ${name}` : '')
      );
      return;
    }

    if (newStatus === 'failed') {
      notifyOwner(
        `🔴 *Order Failed*\n\n` +
        `Order: *${invoice.order_id}*\n` +
        `Amount: ${fmtEur(invoice.amount_eur)} (${invoice.amount_crypto} ${invoice.asset})\n` +
        (name ? `👤 ${name}\n` : '') +
        (data && data.email ? `📧 ${data.email}` : '')
      );
      return;
    }

    if (newStatus === 'cancelled') {
      notifyOwner(
        `⛔ *Order Cancelled*\n\n` +
        `Order: *${invoice.order_id}*\n` +
        `Amount: ${fmtEur(invoice.amount_eur)} (${invoice.amount_crypto} ${invoice.asset})\n` +
        (name ? `👤 ${name}` : '')
      );
    }
  });

  bus.on('contact:submitted', (data) => {
    notifyOwner(
      `📩 *New Contact Message*\n\n` +
      `From: ${data.name || '—'}\n` +
      `Email: ${data.email || '—'}\n` +
      `Message:\n${(data.message || '').slice(0, 1000)}`
    );
  });
}

/** Register bot commands */
function registerCommands() {
  if (!bot) return;

  // Set bot menu commands
  bot.setMyCommands([
    { command: 'orders', description: 'Recent orders' },
    { command: 'order', description: 'Order details — /order PG-XXXXX' },
    { command: 'pending', description: 'Active/awaiting orders' },
    { command: 'paid', description: 'Recent paid orders' },
    { command: 'stats', description: 'Sales statistics' },
    { command: 'search', description: 'Search orders — /search query' },
    { command: 'events', description: 'Order event log — /events PG-XXXXX' },
    { command: 'help', description: 'Command list' },
  ]).catch(() => {});

  bot.onText(/\/start/, (msg) => {
    if (!isOwner(msg.chat.id)) return;
    bot.sendMessage(msg.chat.id,
      '🐧 *PENGER Admin Bot*\n\n' +
      'Real-time order notifications + management.\n\n' +
      '*Commands:*\n' +
      '/orders — Recent orders\n' +
      '/orders 20 — Last N orders\n' +
      '/order PG-XXXXX — Full order details\n' +
      '/pending — Active orders\n' +
      '/paid — Recent paid orders\n' +
      '/stats — Revenue stats\n' +
      '/stats today|week|month\n' +
      '/search John — Search by name/email/city\n' +
      '/events PG-XXXXX — Order event log\n' +
      '/help — This message',
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/help/, (msg) => {
    if (!isOwner(msg.chat.id)) return;
    bot.sendMessage(msg.chat.id,
      '📋 *PENGER Bot Commands*\n\n' +
      '*Orders:*\n' +
      '/orders — Last 10 orders (all statuses)\n' +
      '/orders 30 — Last N orders (max 50)\n' +
      '/order PG-XXXXX — Full details by order ID\n' +
      '/order <uuid> — Full details by invoice UUID\n' +
      '/pending — Orders awaiting payment\n' +
      '/paid — Last 10 paid orders\n' +
      '/paid 20 — Last N paid orders\n\n' +
      '*Search:*\n' +
      '/search John — Search by name\n' +
      '/search gmail.com — Search by email\n' +
      '/search Kyiv — Search by city\n\n' +
      '*Analytics:*\n' +
      '/stats — All time statistics\n' +
      '/stats today — Today\'s stats\n' +
      '/stats week — Last 7 days\n' +
      '/stats month — Last 30 days\n\n' +
      '*Debug:*\n' +
      '/events PG-XXXXX — Full event log for an order',
      { parse_mode: 'Markdown' }
    );
  });

  // /orders [N]
  bot.onText(/\/orders(?:\s+(\d+))?$/, (msg, match) => {
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

      const lines = invoices.map((inv, i) => formatInvoiceShort(inv, i + 1));

      bot.sendMessage(msg.chat.id,
        `📋 *Last ${invoices.length} orders:*\n\n${lines.join('\n\n')}`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      );
    } catch (err) {
      bot.sendMessage(msg.chat.id, '❌ Error: ' + err.message);
    }
  });

  // /paid [N]
  bot.onText(/\/paid(?:\s+(\d+))?/, (msg, match) => {
    if (!isOwner(msg.chat.id)) return;
    const limit = Math.min(parseInt(match[1]) || 10, 50);

    try {
      const db = getDb();
      const invoices = db.prepare(
        "SELECT * FROM payment_invoices WHERE status = 'paid' ORDER BY updated_at DESC LIMIT ?"
      ).all(limit);

      if (invoices.length === 0) {
        return bot.sendMessage(msg.chat.id, 'No paid orders yet.');
      }

      const totalRev = invoices.reduce((sum, inv) => sum + inv.amount_eur, 0);

      const lines = invoices.map((inv, i) => {
        const data = parseOrderData(inv.order_data);
        const name = fullName(data);
        const country = data && data.country ? (' ' + countryFlag(data.country)) : '';
        return `${i + 1}. *${inv.order_id}* — *${fmtEur(inv.amount_eur)}* ${inv.asset}${country}\n` +
          `   ${name || '—'}${data && data.email ? ' · ' + data.email : ''}\n` +
          `   Paid: ${fmtDate(inv.updated_at)}` +
          (inv.tx_signature ? `\n   [TX](https://solscan.io/tx/${inv.tx_signature})` : '');
      });

      bot.sendMessage(msg.chat.id,
        `🟢 *Paid orders (${invoices.length}) — Total: ${fmtEur(totalRev)}*\n\n${lines.join('\n\n')}`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      );
    } catch (err) {
      bot.sendMessage(msg.chat.id, '❌ Error: ' + err.message);
    }
  });

  // /order <id>
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
        inv = db.prepare('SELECT * FROM payment_invoices WHERE order_id LIKE ?').get(`%${query}%`);
      }
      if (!inv) {
        return bot.sendMessage(msg.chat.id, `❌ Order "${query}" not found.`);
      }

      bot.sendMessage(msg.chat.id, formatInvoiceFull(inv), { parse_mode: 'Markdown', disable_web_page_preview: true });
    } catch (err) {
      bot.sendMessage(msg.chat.id, '❌ Error: ' + err.message);
    }
  });

  // /pending
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

      const lines = invoices.map((inv, i) => {
        const data = parseOrderData(inv.order_data);
        const name = fullName(data);
        const remaining = inv.expires_at - Date.now();
        const expiryInfo = remaining > 0
          ? `⏳ ${Math.ceil(remaining / 60000)}min left`
          : `⏰ expired`;
        const country = data && data.country ? (' ' + countryFlag(data.country)) : '';

        return `${i + 1}. ${statusEmoji(inv.status)}\n` +
          `   *${inv.order_id}* — *${fmtEur(inv.amount_eur)}* ${inv.asset}${country}\n` +
          `   ${name || '—'}${data && data.email ? ' · ' + data.email : ''}\n` +
          `   ${expiryInfo} · Created: ${timeAgo(inv.created_at)}`;
      });

      bot.sendMessage(msg.chat.id,
        `⏳ *Pending orders (${invoices.length}):*\n\n${lines.join('\n\n')}`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      );
    } catch (err) {
      bot.sendMessage(msg.chat.id, '❌ Error: ' + err.message);
    }
  });

  // /search <query>
  bot.onText(/\/search\s+(.+)/, (msg, match) => {
    if (!isOwner(msg.chat.id)) return;
    const query = match[1].trim();

    try {
      const db = getDb();
      const pattern = `%${query}%`;
      const invoices = db.prepare(
        'SELECT * FROM payment_invoices WHERE order_id LIKE ? OR order_data LIKE ? ORDER BY created_at DESC LIMIT 20'
      ).all(pattern, pattern);

      if (invoices.length === 0) {
        return bot.sendMessage(msg.chat.id, `🔍 No results for "${query}".`);
      }

      const lines = invoices.map((inv, i) => formatInvoiceShort(inv, i + 1));

      bot.sendMessage(msg.chat.id,
        `🔍 *Search: "${query}" — ${invoices.length} result(s):*\n\n${lines.join('\n\n')}`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      );
    } catch (err) {
      bot.sendMessage(msg.chat.id, '❌ Error: ' + err.message);
    }
  });

  // /events <order_id>
  bot.onText(/\/events\s+(.+)/, (msg, match) => {
    if (!isOwner(msg.chat.id)) return;
    const query = match[1].trim();

    try {
      const db = getDb();
      let inv = db.prepare('SELECT * FROM payment_invoices WHERE order_id = ?').get(query);
      if (!inv) inv = db.prepare('SELECT * FROM payment_invoices WHERE id = ?').get(query);
      if (!inv) inv = db.prepare('SELECT * FROM payment_invoices WHERE order_id LIKE ?').get(`%${query}%`);
      if (!inv) {
        return bot.sendMessage(msg.chat.id, `❌ Order "${query}" not found.`);
      }

      const events = db.prepare(
        'SELECT * FROM payment_events WHERE invoice_id = ? ORDER BY created_at ASC'
      ).all(inv.id);

      if (events.length === 0) {
        return bot.sendMessage(msg.chat.id, `No events for ${inv.order_id}.`);
      }

      const lines = events.map((e, i) => {
        let extra = '';
        try {
          const d = JSON.parse(e.data || '{}');
          const parts = [];
          if (d.sig) parts.push(`tx: ${d.sig.slice(0, 12)}…`);
          if (d.trigger) parts.push(`trigger: ${d.trigger}`);
          if (d.reason) parts.push(`reason: ${d.reason}`);
          if (d.asset) parts.push(d.asset);
          if (d.eurCents) parts.push(fmtEur(d.eurCents));
          if (d.rate) parts.push(`rate: ${d.rate}`);
          if (d.buyer) parts.push(`buyer: ${d.buyer.slice(0, 12)}…`);
          if (parts.length) extra = '\n      ' + parts.join(' · ');
        } catch (err) { /* */ }

        return `${i + 1}. *${e.event}* — ${fmtDate(e.created_at)}${extra}`;
      });

      bot.sendMessage(msg.chat.id,
        `📜 *Event log for ${inv.order_id}:*\n\n${lines.join('\n')}`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      );
    } catch (err) {
      bot.sendMessage(msg.chat.id, '❌ Error: ' + err.message);
    }
  });

  // /stats [period]
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
        whereClause = ` AND created_at >= ${Date.now() - 7 * 86400000}`;
        periodLabel = 'Last 7 Days';
      } else if (period === 'month') {
        whereClause = ` AND created_at >= ${Date.now() - 30 * 86400000}`;
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

      const failed = db.prepare(
        `SELECT COUNT(*) as count FROM payment_invoices WHERE status = 'failed'${whereClause}`
      ).get().count;

      const conversionRate = total > 0 ? ((paid.count / total) * 100).toFixed(1) : '0.0';

      const solPaid = db.prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount_eur), 0) as revenue FROM payment_invoices WHERE status = 'paid' AND asset = 'SOL'${whereClause}`
      ).get();
      const usdcPaid = db.prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount_eur), 0) as revenue FROM payment_invoices WHERE status = 'paid' AND asset = 'USDC'${whereClause}`
      ).get();

      // Country breakdown for paid orders
      const paidOrders = db.prepare(
        `SELECT order_data, amount_eur FROM payment_invoices WHERE status = 'paid'${whereClause}`
      ).all();

      const countryStats = {};
      for (const o of paidOrders) {
        const d = parseOrderData(o.order_data);
        const c = (d && d.country) || 'Unknown';
        if (!countryStats[c]) countryStats[c] = { count: 0, revenue: 0 };
        countryStats[c].count++;
        countryStats[c].revenue += o.amount_eur;
      }

      const topCountries = Object.entries(countryStats)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([code, s]) => {
          const flag = code !== 'Unknown' ? countryFlag(code) + ' ' : '';
          const name = COUNTRY_NAMES[code] || code;
          return `${flag}${name}: ${s.count} orders (${fmtEur(s.revenue)})`;
        });

      const lines = [
        `📊 *PENGER Stats — ${periodLabel}*`,
        ``,
        `Total orders: *${total}*`,
        `✅ Paid: *${paid.count}* (${fmtEur(paid.revenue)})`,
        `⏳ Pending: *${pending}*`,
        `⏰ Expired: *${expired}*`,
        `🔴 Failed: *${failed}*`,
        `📈 Conversion: *${conversionRate}%*`,
        ``,
        `*— By Asset —*`,
        `◎ SOL: ${solPaid.count} orders (${fmtEur(solPaid.revenue)})`,
        `💵 USDC: ${usdcPaid.count} orders (${fmtEur(usdcPaid.revenue)})`,
      ];

      if (topCountries.length > 0) {
        lines.push(``, `*— Top Countries —*`);
        lines.push(...topCountries);
      }

      // Avg order value
      if (paid.count > 0) {
        const avg = Math.round(paid.revenue / paid.count);
        lines.push(``, `*— Averages —*`, `Avg order: ${fmtEur(avg)}`);
      }

      bot.sendMessage(msg.chat.id, lines.join('\n'), { parse_mode: 'Markdown' });
    } catch (err) {
      bot.sendMessage(msg.chat.id, '❌ Error: ' + err.message);
    }
  });

  // Fallback for unknown commands from owner
  bot.on('message', (msg) => {
    if (!isOwner(msg.chat.id)) return;
    if (msg.text && msg.text.startsWith('/') &&
        !msg.text.match(/^\/(start|help|orders|order|pending|paid|stats|search|events)/)) {
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
