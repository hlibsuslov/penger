/* =======================================================================
   PENGER — Production Server
   Serves static files + proxies /api/chat to OpenAI.

   Usage:
     npm install
     cp .env.example .env        # fill in your OPENAI_API_KEY
     npm start                   # production
     npm run dev                 # development (auto-restart)
   ======================================================================= */

require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================================
   SECURITY MIDDLEWARE
   ========================================================= */
app.use(helmet({
  contentSecurityPolicy: false,      // pages set their own CSP via meta tags
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '50kb' }));

/* =========================================================
   STATIC FILES  (the entire site)
   ========================================================= */
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index: 'index.html',
  setHeaders: function (res, filePath) {
    // Cache static assets (fonts, images, CSS, JS)
    if (/\.(svg|png|jpg|woff2?|css|js)$/.test(filePath)) {
      res.set('Cache-Control', 'public, max-age=86400');
    }
    // No cache for HTML
    if (/\.html$/.test(filePath)) {
      res.set('Cache-Control', 'no-cache');
    }
  },
}));

/* =========================================================
   OPENAI CONFIG
   ========================================================= */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL   = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_OUTPUT_TOKENS = parseInt(process.env.MAX_OUTPUT_TOKENS) || 500;
const MAX_INPUT_CHARS   = (parseInt(process.env.MAX_INPUT_TOKENS) || 800) * 4;

const SYSTEM_PROMPT = `You are PENGER AI Tutor — a focused educational assistant for crypto self-custody.

SCOPE — you ONLY discuss:
- BIP39 seed phrases (generation, encoding, wordlist, checksum)
- Cryptocurrency wallets (hot, cold, hardware, software)
- Blockchain fundamentals (blocks, transactions, consensus)
- Private key / public key cryptography basics
- Seed phrase security and backup (metal plates, storage)
- PENGER tools and simulators (binary encoding, punch patterns)

RULES:
1. If the user asks about anything outside this scope (trading, prices, DeFi protocols, NFTs, specific coins, investment advice), politely redirect: "I'm focused on self-custody education. I can help with wallets, seed phrases, and blockchain basics."
2. Keep responses concise: 2-4 short paragraphs maximum.
3. Use bullet points (•) for lists, numbered lists for step-by-step instructions.
4. Use plain text. Bold important terms with **term** sparingly.
5. Never provide financial or investment advice.
6. Never generate or display real seed phrases or private keys.
7. If the user appears to share a real seed phrase, IMMEDIATELY warn them: "Never share your seed phrase with anyone or any website! If this is a real phrase, consider it compromised and move your funds to a new wallet immediately."
8. Be educational and encouraging, like a patient teacher.
9. Reference PENGER's Simulators section when relevant (e.g., "You can practice binary encoding in the Simulators section").
10. Respond in the same language the user writes in.`;

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
  if (messages.length > 20) {
    return { ok: false, status: 400, error: 'Too many messages (max 20).' };
  }

  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return { ok: false, status: 400, error: 'Each message needs role and content.' };
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      return { ok: false, status: 400, error: 'Invalid role. Use "user" or "assistant".' };
    }
    if (typeof msg.content !== 'string' || msg.content.length > 2000) {
      return { ok: false, status: 400, error: 'Message content too long (max 2000 chars).' };
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
   MESSAGE PREPARATION  (sliding window, token budget)
   ========================================================= */
function prepareMessages(messages, context) {
  let systemContent = SYSTEM_PROMPT;
  if (context) {
    systemContent += '\n\nThe user was browsing the "' + context +
      '" topic in the guided scenarios before asking this question. Use this context to give a more relevant answer.';
  }

  const prepared = [{ role: 'system', content: systemContent }];

  let totalChars = systemContent.length;
  const trimmed = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgChars = messages[i].content.length;
    if (totalChars + msgChars > MAX_INPUT_CHARS) break;
    totalChars += msgChars;
    trimmed.unshift(messages[i]);
  }

  // Always include at least the latest message
  if (trimmed.length === 0 && messages.length > 0) {
    const last = messages[messages.length - 1];
    trimmed.push({
      role: last.role,
      content: last.content.slice(0, MAX_INPUT_CHARS - systemContent.length),
    });
  }

  return prepared.concat(trimmed);
}

/* =========================================================
   POST /api/chat
   ========================================================= */
app.post('/api/chat', chatLimiter, async (req, res) => {
  // Check API key is configured
  if (!OPENAI_API_KEY) {
    return res.status(503).json({ error: 'AI service is not configured.' });
  }

  // Validate input
  const validation = validateRequest(req.body);
  if (!validation.ok) {
    return res.status(validation.status).json({ error: validation.error });
  }

  // Prepare messages with sliding window
  const apiMessages = prepareMessages(req.body.messages, req.body.context);

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
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

/* =========================================================
   START
   ========================================================= */
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  PENGER server running on http://localhost:' + PORT);
  console.log('  OpenAI API: ' + (OPENAI_API_KEY ? 'configured (' + OPENAI_MODEL + ')' : 'NOT configured — set OPENAI_API_KEY in .env'));
  console.log('');
});
