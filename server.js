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
  next();
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
const GUIDE_SLUGS = new Set([
  'seed-anatomy', 'wallet-anatomy', 'self-sovereignty',
  'wallet-comparison', 'opsec', 'passphrase', 'multisig'
]);

app.get('/guides/:slug', function (req, res, next) {
  if (GUIDE_SLUGS.has(req.params.slug)) {
    var t = res.locals.t;
    var guideData = (t.guidePages && t.guidePages[req.params.slug]) || {};
    return res.render('guides/' + req.params.slug + '/page', {
      pageSlug: req.params.slug,
      pageTitle: guideData.title || 'PENGER Academy',
      pageDescription: guideData.metaDescription || '',
      pageKeywords: guideData.keywords || '',
      favicon: guideData.favicon || '/svg/e.svg',
      extraCss: [],
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
  '/': { view: 'pages/index', dataKey: 'index', css: ['landing.css', 'about-us.css'], preloadFont: true },
  '/guides': { view: 'pages/guides', dataKey: 'guides', css: [] },
  '/simulators': { view: 'pages/simulators', dataKey: 'simulators', css: [] },
  '/dictionary': { view: 'pages/dictionary', dataKey: 'dictionary', css: [] },
  '/ai-tutor': { view: 'pages/ai-tutor', dataKey: 'aiTutor', css: [] },
  '/about-us': { view: 'pages/about-us', dataKey: 'aboutUs', css: ['about-us.css'] },
  '/contacts': { view: 'pages/contacts', dataKey: 'contacts', css: ['contacts.css'] },
  '/payment-success': { view: 'pages/payment-success', dataKey: 'paymentSuccess', css: [] },
  '/payment-failed': { view: 'pages/payment-failed', dataKey: 'paymentFailed', css: [] },
  '/cookie-policy': { view: 'pages/cookie-policy', dataKey: 'cookiePolicy', css: ['about-us.css'] },
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
      preloadFont: cfg.preloadFont || false,
    });
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
  res.json({
    status: 'ok',
    ai: OPENAI_API_KEY ? 'configured' : 'not configured',
    model: OPENAI_MODEL,
  });
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
  });
});

/* =========================================================
   START
   ========================================================= */
app.listen(PORT, '0.0.0.0', () => {
  const envPath = path.join(__dirname, '.env');
  const envExists = require('fs').existsSync(envPath);
  console.log('');
  console.log('  PENGER server running on http://localhost:' + PORT);
  console.log('  .env file: ' + (envExists ? envPath : 'NOT FOUND at ' + envPath));
  console.log('  OpenAI API: ' + (OPENAI_API_KEY ? 'configured (' + OPENAI_MODEL + ')' : 'NOT configured — set OPENAI_API_KEY in .env'));
  console.log('  Languages: en, uk');
  console.log('');
});
