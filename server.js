/* =======================================================================
   PENGER — Production Server
   Serves EJS-rendered pages with i18n + proxies /api/chat to OpenAI.

   Usage:
     npm install
     cp .env.example .env        # fill in your OPENAI_API_KEY
     npm start                   # production
     npm run dev                 # development (auto-restart)
   ======================================================================= */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const bus = require('./src/events');
const { getEurUahRate } = require('./src/nbu-rate');
const { generateInvoicePdf } = require('./src/invoice-pdf');
const { saveOrder, getOrder } = require('./src/order-store');
const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================================
   COMPRESSION
   ========================================================= */
app.use(compression());

/* =========================================================
   SECURITY MIDDLEWARE
   ========================================================= */
app.use(helmet({
  contentSecurityPolicy: false,      // pages set their own CSP via meta tags
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '50kb' }));

/* =========================================================
   EJS SETUP
   ========================================================= */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* =========================================================
   LOAD TRANSLATIONS
   ========================================================= */
const translations = {
  en: require('./locales/en.json'),
  uk: require('./locales/uk.json'),
};

const SUPPORTED_LANGS = new Set(Object.keys(translations));

/* =========================================================
   LANGUAGE MIDDLEWARE — /uk/ prefix → req.lang = 'uk'
   ========================================================= */
app.use(function (req, res, next) {
  var match = req.path.match(/^\/uk(\/|$)/);
  if (match) {
    req.lang = 'uk';
    req.url = req.url.replace(/^\/uk/, '') || '/';
  } else {
    req.lang = 'en';
  }
  next();
});

/* =========================================================
   TRANSLATION LOCALS — available in every EJS template
   ========================================================= */
app.use(function (req, res, next) {
  var lang = req.lang || 'en';
  res.locals.t = translations[lang];
  res.locals.lang = lang;
  res.locals.langPrefix = lang === 'en' ? '' : '/' + lang;
  res.locals.canonicalBase = 'https://mypenger.com';
  res.locals.currentPath = req.path;
  res.locals.gtmId = process.env.GTM_ID || 'GTM-MRBLXV3T';
  res.locals.gaId = process.env.GA_ID || 'G-4DKG21ZFFX';
  res.locals.clarityId = process.env.CLARITY_ID || 'vwthoa78ix';
  res.set('Link', '<https://mypenger.com/llms.txt>; rel="alternate"; type="text/plain"');
  next();
});

/* =========================================================
   LLM CONTEXT FILES — proper content-type + Link headers
   ========================================================= */
app.get('/llms.txt', function (req, res) {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=86400');
  res.set('X-Robots-Tag', 'noindex');
  res.set('Link', '</llms-full.txt>; rel="alternate"; type="text/plain"; title="Full LLM context"');
  res.sendFile(path.join(__dirname, 'public', 'llms.txt'));
});

app.get('/llms-full.txt', function (req, res) {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=86400');
  res.set('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(__dirname, 'public', 'llms-full.txt'));
});

/* =========================================================
   WELL-KNOWN — security.txt
   ========================================================= */
app.get('/.well-known/security.txt', function (req, res) {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send('Contact: mailto:contact@mypenger.com\nPreferred-Languages: en, uk\nCanonical: https://mypenger.com/.well-known/security.txt\nExpires: 2027-03-22T00:00:00.000Z\n');
});

/* =========================================================
   STATIC FILES  (CSS, JS, images, SVGs)
   ========================================================= */
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: function (res, filePath) {
    if (/\.(svg|png|jpg|woff2?|css|js)$/.test(filePath)) {
      res.set('Cache-Control', 'public, max-age=86400');
    }
  },
}));

/* =========================================================
   TUTOR SCENARIOS — serve language-specific JSON
   ========================================================= */
app.get('/tutor-scenarios.json', function (req, res) {
  var lang = req.lang || 'en';
  res.sendFile(path.join(__dirname, 'locales', 'tutor-scenarios-' + lang + '.json'));
});

/* =========================================================
   ACADEMY CLEAN URLs — /guides/:slug
   ========================================================= */
const GUIDE_ORDER = [
  'seed-anatomy', 'wallet-anatomy', 'self-sovereignty',
  'wallet-comparison', 'opsec', 'passphrase', 'multisig'
];
const GUIDE_SLUGS = new Set(GUIDE_ORDER);

/* Slug → translation title key mapping */
var GUIDE_TITLE_KEYS = {
  'seed-anatomy': 'guideSeedTitle',
  'wallet-anatomy': 'guideWalletTitle',
  'self-sovereignty': 'guideSovereigntyTitle',
  'wallet-comparison': 'guideComparisonTitle',
  'opsec': 'guideOpsecTitle',
  'passphrase': 'guidePassphraseTitle',
  'multisig': 'guideMultisigTitle'
};

app.get('/guides/:slug', function (req, res, next) {
  if (GUIDE_SLUGS.has(req.params.slug)) {
    var t = res.locals.t;
    var guideData = (t.guidePages && t.guidePages[req.params.slug]) || {};
    var idx = GUIDE_ORDER.indexOf(req.params.slug);
    var prevSlug = idx > 0 ? GUIDE_ORDER[idx - 1] : null;
    var nextSlug = idx < GUIDE_ORDER.length - 1 ? GUIDE_ORDER[idx + 1] : null;
    var guideMeta = (t.index && t.index.guideMeta && t.index.guideMeta[req.params.slug]) || {};
    return res.render('guides/' + req.params.slug + '/page', {
      pageSlug: req.params.slug,
      pageTitle: guideData.title || 'PENGER Academy',
      pageDescription: guideData.metaDescription || '',
      pageKeywords: guideData.keywords || '',
      favicon: guideData.favicon || '/svg/e.svg',
      extraCss: [],
      extraJs: [],
      prevSlug: prevSlug,
      nextSlug: nextSlug,
      prevTitle: prevSlug ? (t.index[GUIDE_TITLE_KEYS[prevSlug]] || '') : '',
      nextTitle: nextSlug ? (t.index[GUIDE_TITLE_KEYS[nextSlug]] || '') : '',
      guideMeta: guideMeta,
      guideTotal: GUIDE_ORDER.length,
      ogType: 'article',
      guideData: guideData,
    });
  }
  next();
});

/* =========================================================
   301 REDIRECTS — old guide URLs → new clean paths
   ========================================================= */
app.get('/guide-:slug.html', function (req, res, next) {
  var prefix = req.lang === 'en' ? '' : '/' + req.lang;
  if (GUIDE_SLUGS.has(req.params.slug)) {
    return res.redirect(301, prefix + '/guides/' + req.params.slug);
  }
  next();
});

app.get('/guide-:slug', function (req, res, next) {
  var prefix = req.lang === 'en' ? '' : '/' + req.lang;
  if (GUIDE_SLUGS.has(req.params.slug)) {
    return res.redirect(301, prefix + '/guides/' + req.params.slug);
  }
  next();
});

app.get('/guides.html', function (req, res) {
  var prefix = req.lang === 'en' ? '' : '/' + req.lang;
  res.redirect(301, prefix + '/guides');
});

/* =========================================================
   PAGE ROUTES
   ========================================================= */
var PAGE_CONFIGS = {
  '/': { view: 'pages/index', dataKey: 'index', css: ['landing.css?v=42', 'about-us.css'], js: [], preloadFont: true },
  '/guides': { view: 'pages/guides', dataKey: 'guides', css: [], js: [] },
  '/simulators': { view: 'pages/simulators', dataKey: 'simulators', css: [], js: ['js/bip39-wordlist.js', 'script.js'] },
  '/dictionary': { view: 'pages/dictionary', dataKey: 'dictionary', css: [], js: ['js/bip39-wordlist.js', 'dictionary.js'] },
  '/ai-tutor': { view: 'pages/ai-tutor', dataKey: 'aiTutor', css: [], js: ['js/ai-tutor.js'] },
  '/about-us': { view: 'pages/about-us', dataKey: 'aboutUs', css: ['about-us.css', 'dropshipping.css'], js: [] },
  '/contacts': { view: 'pages/contacts', dataKey: 'contacts', css: ['contacts.css', 'dropshipping.css'], js: ['js/contacts.js'] },
  '/order': { view: 'pages/order', dataKey: 'order', css: [], js: ['js/order.js'], ogType: 'product' },
  '/checkout': { view: 'pages/checkout', dataKey: 'order', css: [], js: ['js/checkout.js'] },
  '/payment-success': { view: 'pages/payment-success', dataKey: 'paymentSuccess', css: [], js: [] },
  '/payment-failed': { view: 'pages/payment-failed', dataKey: 'paymentFailed', css: [], js: [] },
  '/cookie-policy': { view: 'pages/cookie-policy', dataKey: 'cookiePolicy', css: ['about-us.css'], js: [] },
  '/dropshipping': { view: 'pages/dropshipping', dataKey: 'dropshipping', css: ['dropshipping.css'], js: [] },
};

Object.keys(PAGE_CONFIGS).forEach(function (route) {
  var cfg = PAGE_CONFIGS[route];
  app.get(route, function (req, res) {
    var t = res.locals.t;
    var pageData = t[cfg.dataKey] || {};
    res.render(cfg.view, {
      pageTitle: pageData.title || 'PENGER',
      pageDescription: pageData.metaDescription || '',
      pageKeywords: pageData.keywords || '',
      ogDescription: pageData.ogDescription || pageData.metaDescription || '',
      extraCss: cfg.css || [],
      extraJs: cfg.js || [],
      preloadFont: cfg.preloadFont || false,
      ogType: cfg.ogType || 'website',
    });
  });
});

/* =========================================================
   INVOICE PAGE — custom route (needs NBU EUR/UAH rate)
   ========================================================= */
app.get('/invoice', async function (req, res) {
  var t = res.locals.t;
  var pageData = t.invoice || {};
  var nbu = { rate: 45.0, date: '—' };
  try { nbu = await getEurUahRate(); } catch (e) { console.warn('[invoice] NBU rate fetch failed:', e.message); }
  res.render('pages/invoice', {
    pageTitle: pageData.title || 'Invoice — PENGER',
    pageDescription: pageData.metaDescription || '',
    pageKeywords: '',
    ogDescription: pageData.metaDescription || '',
    extraCss: [],
    extraJs: [],
    preloadFont: false,
    ogType: 'website',
    eurUahRate: nbu.rate,
    eurUahDate: nbu.date,
  });
});

/* =========================================================
   301 REDIRECTS — any *.html page → clean URL
   ========================================================= */
app.get('/:page.html', function (req, res) {
  var prefix = req.lang === 'en' ? '' : '/' + req.lang;
  var clean = req.params.page === 'index' ? '/' : '/' + req.params.page;
  res.redirect(301, prefix + clean);
});

/* =========================================================
   SOLANA CHECKOUT — Database + Invoice API + Verification
   ========================================================= */
const db = require('./src/db');
const invoiceRoutes = require('./src/invoice-routes');
const adminRoutes = require('./src/admin-routes');
const { startPoller } = require('./src/solana-verify');
const { startBot } = require('./src/telegram-bot');

db.init();
app.use('/api', invoiceRoutes);
app.use('/api/admin', adminRoutes);

/* =========================================================
   OPENAI CONFIG
   ========================================================= */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL   = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_OUTPUT_TOKENS = parseInt(process.env.MAX_OUTPUT_TOKENS) || 1000;
const MAX_INPUT_CHARS   = (parseInt(process.env.MAX_INPUT_TOKENS) || 1600) * 4;

const SYSTEM_PROMPT = `You are PENGER AI Tutor — an educational assistant for crypto self-custody and blockchain technology.

CONVERSATION MEMORY:
- You receive the full conversation history. Use it actively: reference what the user said earlier, build on previously discussed concepts, and avoid repeating information already covered.
- If the user returns to a topic discussed earlier, acknowledge it and go deeper rather than starting from scratch.
- Track the user's knowledge level from their questions and adapt complexity accordingly — start simple, get more technical as they demonstrate understanding.
- When the user asks a follow-up question, connect it to the prior context naturally.

SCOPE — you discuss the following crypto and blockchain topics:
- BIP39 seed phrases (generation, encoding, wordlist, checksum, passphrases, derivation paths)
- Cryptocurrency wallets (hot, cold, hardware, software, multisig, MPC wallets)
- Blockchain fundamentals (blocks, transactions, consensus, Proof of Work, Proof of Stake)
- Private key / public key cryptography (ECDSA, EdDSA, key derivation, signing)
- Seed phrase security and backup (metal plates, storage, Shamir's Secret Sharing)
- PENGER tools and simulators (binary encoding, punch patterns)
- DeFi concepts (DEXs, lending protocols, liquidity pools, yield farming, AMMs, bridges)
- Smart contracts and dApps (how they work, EVM, gas, common patterns)
- NFTs and digital ownership (standards, minting, metadata, use cases)
- Layer 1 and Layer 2 solutions (rollups, sidechains, state channels, scaling)
- Tokenomics (token types, supply mechanics, governance tokens, staking rewards)
- DAOs and on-chain governance
- Staking and validator mechanics
- Crypto exchanges (CEX vs DEX, order books, liquidity)
- Blockchain security (common attack vectors, audits, rug pulls, phishing, social engineering)
- Bitcoin ecosystem (Lightning Network, Ordinals, Taproot, SegWit)
- Ethereum ecosystem (EIPs, The Merge, sharding, account abstraction)
- Cross-chain interoperability (bridges, atomic swaps, IBC)
- Privacy in crypto (mixers, zero-knowledge proofs, privacy chains)
- Regulation and compliance basics (KYC/AML, travel rule — factual only, no legal advice)

RULES:
1. If the user asks about something completely unrelated to crypto and blockchain, politely redirect: "I specialize in crypto and blockchain education. I can help with wallets, DeFi, blockchain technology, and much more — just ask!"
2. Keep responses concise but thorough: 2-5 short paragraphs. For complex topics, use up to 6 paragraphs if needed.
3. Use bullet points (•) for lists, numbered lists for step-by-step instructions.
4. Use plain text. Bold important terms with **term** sparingly. Never use markdown headers (#, ##, ###) — use **bold** for section titles instead.
5. Never provide financial or investment advice, price predictions, or specific trading recommendations. If asked, say: "I can explain how this works technically, but I can't give investment advice."
6. Never generate or display real seed phrases or private keys.
7. If the user appears to share a real seed phrase, IMMEDIATELY warn them: "Never share your seed phrase with anyone or any website! If this is a real phrase, consider it compromised and move your funds to a new wallet immediately."
8. Be educational and encouraging, like a patient teacher. Use analogies to explain complex concepts.
9. Reference PENGER's Simulators section when relevant (e.g., "You can practice binary encoding in the Simulators section").
10. Respond in the same language the user writes in.
11. When explaining protocols or mechanisms, give concrete examples to illustrate how they work.
12. If a topic has security implications, always mention relevant risks and best practices.`;

/* =========================================================
   PROMO CODES CONFIG (server-side source of truth)
   ========================================================= */
const PROMO_CODES = {
  'PENGER10': { type: 'percent', value: 10, expires: null, maxUses: null, isReferral: false },
  '99': { type: 'percent', value: 99, expires: null, maxUses: null, isReferral: false },
};
const REFERRAL_CODES = {
  'CRAFT2026': { type: 'percent', value: 20, expires: null, maxUses: null, isReferral: true },
};
const ALL_CODES = Object.assign({}, PROMO_CODES, REFERRAL_CODES);

/* In-memory usage counters (resets on server restart — use DB for persistence) */
const promoUsageCounts = {};

/* =========================================================
   POST /api/validate-promo
   ========================================================= */
const promoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { valid: false, error: 'Too many attempts. Please wait a minute.' },
});

app.post('/api/validate-promo', promoLimiter, function (req, res) {
  var code = (req.body.code || '').trim().toUpperCase();
  var subtotal = parseFloat(req.body.subtotal) || 0;

  if (!code || code.length < 2 || code.length > 30 || !/^[A-Z0-9_-]+$/.test(code)) {
    return res.json({ valid: false, error: 'Invalid promo code' });
  }

  var promo = ALL_CODES[code];
  if (!promo) {
    return res.json({ valid: false, error: 'Invalid promo code' });
  }

  /* Check expiry */
  if (promo.expires) {
    var expDate = new Date(promo.expires);
    if (Date.now() > expDate.getTime()) {
      return res.json({ valid: false, error: 'This promo code has expired' });
    }
  }

  /* Check usage limits */
  if (promo.maxUses !== null) {
    var used = promoUsageCounts[code] || 0;
    if (used >= promo.maxUses) {
      return res.json({ valid: false, error: 'This promo code is no longer available' });
    }
  }

  /* Calculate discount */
  var discount;
  if (promo.type === 'percent') {
    discount = Math.round(subtotal * promo.value / 100);
  } else {
    discount = promo.value;
  }
  discount = Math.min(discount, subtotal); /* Cap: discount cannot exceed subtotal */

  return res.json({
    valid: true,
    type: promo.type,
    value: promo.value,
    discount: discount,
    isReferral: !!promo.isReferral,
  });
});

/* ===== NOVA POSHTA API PROXY ===== */
const NP_API_KEY = process.env.NP_API_KEY || '4f9ad6dff84a2989a404dc2862a2e10c';

app.post('/api/novaposhta', function (req, res) {
  var modelName = req.body.modelName;
  var calledMethod = req.body.calledMethod;
  var methodProperties = req.body.methodProperties || {};

  var allowed = {
    'Address:searchSettlements': true,
    'AddressGeneral:getWarehouses': true,
  };
  if (!allowed[modelName + ':' + calledMethod]) {
    return res.status(400).json({ success: false, error: 'Method not allowed' });
  }

  var payload = JSON.stringify({
    apiKey: NP_API_KEY,
    modelName: modelName,
    calledMethod: calledMethod,
    methodProperties: methodProperties,
  });

  var https = require('https');
  var npReq = https.request('https://api.novaposhta.ua/v2.0/json/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  }, function (npRes) {
    var chunks = [];
    npRes.on('data', function (c) { chunks.push(c); });
    npRes.on('end', function () {
      try {
        var body = JSON.parse(Buffer.concat(chunks).toString());
        res.json(body);
      } catch (e) {
        res.status(502).json({ success: false, error: 'Invalid response from Nova Poshta' });
      }
    });
  });
  npReq.on('error', function () {
    res.status(502).json({ success: false, error: 'Nova Poshta API unavailable' });
  });
  npReq.write(payload);
  npReq.end();
});

/* UA order (invoice / COD / card transfer) — notify Telegram, redirect client to success */
app.post('/api/ua-order', function (req, res) {
  var data = req.body;
  if (!data || !data.order_id) return res.status(400).json({ ok: false });

  var methodLabels = {
    'ua-cod': 'Накладений платіж (COD)',
    'ua-invoice': 'Сплата за фактурою (Invoice)',
    'ua-card': 'На карту (Card transfer)'
  };

  bus.emit('order:ua-submitted', {
    orderId: data.order_id,
    payMethod: methodLabels[data.pay_method] || data.pay_method,
    total: data.value,
    currency: data.currency || 'EUR',
    contact: data.contact || {},
    address: data.address || {},
    npCity: data.np_city || '',
    npWarehouse: data.np_warehouse || '',
    plates: data.plates,
    sleeveColors: data.sleeveColors,
    punchTool: data.punchTool,
    shipping: data.shipping,
    discount: data.discount,
    promo: data.promo,
    referral: data.referral
  });

  if (data.promo) incrementPromoUsage(data.promo);

  try { saveOrder(data.order_id, data); } catch (e) { console.warn('[ua-order] saveOrder failed:', e.message); }

  res.json({ ok: true, order_id: data.order_id });
});

/* ---- Order data retrieval (for page refresh persistence) ---- */
app.get('/api/order/:id', function (req, res) {
  var orderId = req.params.id;
  if (!orderId || orderId.length > 50) return res.status(400).json({ error: 'Invalid order ID' });
  var order = getOrder(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

/* ---- Invoice PDF download ---- */
app.post('/api/invoice-pdf', async function (req, res) {
  var data = req.body;
  if (!data || !data.order_id) return res.status(400).json({ ok: false, error: 'Missing order data' });

  var nbu = { rate: 45.0, date: '—' };
  try { nbu = await getEurUahRate(); } catch (e) { console.warn('[invoice-pdf] NBU rate failed:', e.message); }

  try {
    var orderId = String(data.order_id).replace(/[^a-zA-Z0-9_\-]/g, '');
    var filename = 'rahunok-' + orderId + '.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');

    var pdfDoc = generateInvoicePdf(data, data.order_id, nbu);
    pdfDoc.pipe(res);
  } catch (e) {
    console.error('[invoice-pdf] Generation failed:', e);
    if (!res.headersSent) res.status(500).json({ ok: false, error: 'PDF generation failed' });
  }
});

/* Increment promo usage counter (call from checkout endpoint when order is confirmed) */
function incrementPromoUsage(code) {
  if (!code) return;
  code = code.trim().toUpperCase();
  if (ALL_CODES[code] && ALL_CODES[code].maxUses !== null) {
    promoUsageCounts[code] = (promoUsageCounts[code] || 0) + 1;
  }
}

/* =========================================================
   RATE LIMITER  — /api/chat: 20 requests per minute per IP
   ========================================================= */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a minute.' },
});

/* =========================================================
   INPUT VALIDATION
   ========================================================= */
function validateRequest(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Invalid request body.' };
  }

  const { messages, context } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, status: 400, error: 'Messages array is required.' };
  }
  if (messages.length > 30) {
    return { ok: false, status: 400, error: 'Too many messages (max 30).' };
  }

  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return { ok: false, status: 400, error: 'Each message needs role and content.' };
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      return { ok: false, status: 400, error: 'Invalid role. Use "user" or "assistant".' };
    }
    if (typeof msg.content !== 'string' || msg.content.length > 3000) {
      return { ok: false, status: 400, error: 'Message content too long (max 3000 chars).' };
    }
    if (msg.content.trim().length === 0) {
      return { ok: false, status: 400, error: 'Empty message content.' };
    }
  }

  if (context !== undefined && (typeof context !== 'string' || context.length > 100)) {
    return { ok: false, status: 400, error: 'Invalid context parameter.' };
  }

  return { ok: true };
}

/* =========================================================
   MESSAGE PREPARATION  (context-aware sliding window)
   ========================================================= */
function prepareMessages(messages, context, lang) {
  let systemContent = SYSTEM_PROMPT;
  if (lang === 'uk') {
    systemContent += '\n\nIMPORTANT: The user is browsing the Ukrainian version of the site. Respond in Ukrainian language.';
  }
  if (context) {
    systemContent += '\n\nThe user was browsing the "' + context +
      '" topic in the guided scenarios before asking this question. Use this context to give a more relevant answer.';
  }

  const budget = MAX_INPUT_CHARS;
  let totalChars = systemContent.length;

  const firstExchange = [];
  for (let i = 0; i < Math.min(messages.length, 2); i++) {
    firstExchange.push(messages[i]);
    totalChars += messages[i].content.length;
  }

  if (messages.length <= 2) {
    return [{ role: 'system', content: systemContent }].concat(firstExchange);
  }

  const recentMessages = [];
  for (let i = messages.length - 1; i >= firstExchange.length; i--) {
    const msgChars = messages[i].content.length;
    if (totalChars + msgChars > budget) break;
    totalChars += msgChars;
    recentMessages.unshift(messages[i]);
  }

  if (recentMessages.length === 0) {
    const last = messages[messages.length - 1];
    const maxLen = Math.max(200, budget - totalChars);
    recentMessages.push({
      role: last.role,
      content: last.content.slice(0, maxLen),
    });
  }

  const firstKept = firstExchange.length;
  const recentStart = messages.length - recentMessages.length;
  const droppedCount = recentStart - firstKept;

  const result = [{ role: 'system', content: systemContent }];
  result.push(...firstExchange);

  if (droppedCount > 0) {
    const droppedTopics = [];
    for (let i = firstKept; i < recentStart; i++) {
      if (messages[i].role === 'user') {
        const snippet = messages[i].content.slice(0, 80).replace(/\n/g, ' ').trim();
        droppedTopics.push(snippet);
      }
    }

    let gapNote = '[Earlier in this conversation (' + droppedCount +
      ' messages were exchanged)';
    if (droppedTopics.length > 0) {
      gapNote += ' — the user also asked about: ' +
        droppedTopics.map(function (t) { return '"' + t + '"'; }).join(', ');
    }
    gapNote += '. Continue naturally from this context.]';

    result.push({ role: 'system', content: gapNote });
  }

  result.push(...recentMessages);
  return result;
}

/* =========================================================
   POST /api/chat
   ========================================================= */
app.post('/api/chat', chatLimiter, async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(503).json({ error: 'AI service is not configured.' });
  }

  const validation = validateRequest(req.body);
  if (!validation.ok) {
    return res.status(validation.status).json({ error: validation.error });
  }

  const lang = req.body.lang || 'en';
  const apiMessages = prepareMessages(req.body.messages, req.body.context, lang);

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: apiMessages,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('[OpenAI Error]', openaiRes.status, errText);
      const status = openaiRes.status === 429 ? 503 : 502;
      return res.status(status).json({
        error: 'AI service temporarily unavailable. Please try again.',
      });
    }

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return res.json({ reply });
  } catch (err) {
    console.error('[Server Error]', err.message);
    return res.status(500).json({ error: 'Internal error. Please try again.' });
  }
});

/* =========================================================
   HEALTH CHECK
   ========================================================= */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* =========================================================
   404 FALLBACK
   ========================================================= */
app.use(function (req, res) {
  var t = res.locals.t;
  var pageData = t.error404 || {};
  res.status(404).render('pages/404', {
    pageTitle: pageData.title || '404 — PENGER',
    pageDescription: pageData.metaDescription || '',
    pageKeywords: '',
    pageRobots: 'noindex, nofollow',
    extraCss: [],
    extraJs: [],
  });
});

/* =========================================================
   START
   ========================================================= */
app.listen(PORT, '0.0.0.0', () => {
  startPoller();
  startBot();
  const envPath = path.join(__dirname, '.env');
  const envExists = require('fs').existsSync(envPath);
  console.log('');
  console.log('  PENGER server running on http://localhost:' + PORT);
  console.log('  .env file: ' + (envExists ? envPath : 'NOT FOUND at ' + envPath));
  console.log('  OpenAI API: ' + (OPENAI_API_KEY ? 'configured (' + OPENAI_MODEL + ')' : 'NOT configured — set OPENAI_API_KEY in .env'));
  console.log('  Solana RPC: ' + (process.env.SOLANA_RPC_URL || 'default (mainnet-beta)'));
  console.log('  Merchant Wallet: ' + (process.env.MERCHANT_WALLET || 'NOT configured — set MERCHANT_WALLET in .env'));
  console.log('  Telegram Bot: ' + (process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'NOT configured — set TELEGRAM_BOT_TOKEN in .env'));
  console.log('  Admin API: ' + (process.env.ADMIN_API_KEY ? 'configured' : 'NOT configured — set ADMIN_API_KEY in .env'));
  console.log('  Languages: en, uk');
  console.log('');
});
