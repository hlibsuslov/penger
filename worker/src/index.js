/* =======================================================================
   PENGER AI Tutor — Cloudflare Worker Proxy
   Proxies requests to OpenAI Chat Completions API with:
   - Strict system prompt (crypto self-custody scope only)
   - Per-IP rate limiting
   - Input validation & token budgeting
   - CORS origin whitelist
   ======================================================================= */

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
7. If the user appears to share a real seed phrase, IMMEDIATELY warn them: "⚠ Never share your seed phrase with anyone or any website! If this is a real phrase, consider it compromised and move your funds to a new wallet immediately."
8. Be educational and encouraging, like a patient teacher.
9. Reference PENGER's Simulators section when relevant (e.g., "You can practice binary encoding in the Simulators section").
10. Respond in the same language the user writes in.`;

/* =========================================================
   CORS
   ========================================================= */
function corsHeaders(origin, allowedOrigin) {
  const isAllowed =
    origin === allowedOrigin ||
    (origin && origin.startsWith('http://localhost:')) ||
    (origin && origin.startsWith('http://127.0.0.1:'));

  if (!isAllowed) return null;

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

/* =========================================================
   RATE LIMITER  (in-memory, per-IP, resets on Worker eviction)
   ========================================================= */
const rateLimitMap = new Map();

function checkRateLimit(ip, maxRpm) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= maxRpm) return false;
  entry.count++;
  return true;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt + 120000) rateLimitMap.delete(ip);
  }
}, 300000);

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
function prepareMessages(messages, context, maxInputChars) {
  let systemContent = SYSTEM_PROMPT;
  if (context) {
    systemContent +=
      '\n\nThe user was browsing the "' +
      context +
      '" topic in the guided scenarios before asking this question. Use this context to give a more relevant answer.';
  }

  const prepared = [{ role: 'system', content: systemContent }];

  // Walk newest → oldest, keep as many as fit in budget
  let totalChars = systemContent.length;
  const trimmed = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgChars = messages[i].content.length;
    if (totalChars + msgChars > maxInputChars) break;
    totalChars += msgChars;
    trimmed.unshift(messages[i]);
  }

  // Always include at least the latest message
  if (trimmed.length === 0 && messages.length > 0) {
    const last = messages[messages.length - 1];
    trimmed.push({
      role: last.role,
      content: last.content.slice(0, maxInputChars - systemContent.length),
    });
  }

  return prepared.concat(trimmed);
}

/* =========================================================
   JSON RESPONSE HELPER
   ========================================================= */
function jsonResponse(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

/* =========================================================
   MAIN HANDLER
   ========================================================= */
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || '';
    const cors = corsHeaders(origin, allowedOrigin);

    // --- Preflight ---
    if (request.method === 'OPTIONS') {
      if (!cors) return new Response('Forbidden', { status: 403 });
      return new Response(null, { status: 204, headers: cors });
    }

    // --- Route check ---
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/api/chat') {
      return new Response('Not found', { status: 404 });
    }

    // --- CORS check ---
    if (!cors) {
      return new Response('Origin not allowed', { status: 403 });
    }

    // --- Rate limit ---
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const maxRpm = parseInt(env.RATE_LIMIT_RPM) || 20;
    if (!checkRateLimit(ip, maxRpm)) {
      return jsonResponse(
        { error: 'Too many requests. Please wait a minute.' },
        429,
        cors
      );
    }

    // --- Parse body ---
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON.' }, 400, cors);
    }

    // --- Validate ---
    const validation = validateRequest(body);
    if (!validation.ok) {
      return jsonResponse({ error: validation.error }, validation.status, cors);
    }

    // --- Prepare messages ---
    const maxInputChars = (parseInt(env.MAX_INPUT_TOKENS) || 800) * 4;
    const maxOutputTokens = parseInt(env.MAX_OUTPUT_TOKENS) || 500;
    const apiMessages = prepareMessages(body.messages, body.context, maxInputChars);

    // --- Call OpenAI ---
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + env.OPENAI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: apiMessages,
          max_tokens: maxOutputTokens,
          temperature: 0.7,
        }),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error('OpenAI error:', openaiRes.status, errText);
        // Map OpenAI 429 → 503 so client distinguishes our limit from theirs
        const status = openaiRes.status === 429 ? 503 : 502;
        return jsonResponse(
          { error: 'AI service temporarily unavailable. Please try again.' },
          status,
          cors
        );
      }

      const data = await openaiRes.json();
      const reply =
        data.choices?.[0]?.message?.content ||
        'Sorry, I could not generate a response.';

      return jsonResponse({ reply }, 200, cors);
    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse(
        { error: 'Internal error. Please try again.' },
        500,
        cors
      );
    }
  },
};
