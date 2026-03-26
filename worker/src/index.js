/* =======================================================================
   PENGER AI Tutor — Cloudflare Worker Proxy
   Proxies requests to OpenAI Chat Completions API with:
   - Strict system prompt (crypto self-custody scope only)
   - Per-IP rate limiting
   - Input validation & token budgeting
   - CORS origin whitelist
   ======================================================================= */

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
   Keeps the first user+assistant exchange (conversation topic),
   then fills the remaining budget with the most recent messages.
   If middle messages were dropped, injects a brief summary so
   the model knows what was discussed earlier.
   ========================================================= */
function prepareMessages(messages, context, maxInputChars) {
  let systemContent = SYSTEM_PROMPT;
  if (context) {
    systemContent +=
      '\n\nThe user was browsing the "' +
      context +
      '" topic in the guided scenarios before asking this question. Use this context to give a more relevant answer.';
  }

  const budget = maxInputChars;
  let totalChars = systemContent.length;

  // --- Step 1: reserve the first exchange (sets the conversation topic) ---
  const firstExchange = [];
  for (let i = 0; i < Math.min(messages.length, 2); i++) {
    firstExchange.push(messages[i]);
    totalChars += messages[i].content.length;
  }

  // If only 1-2 messages, just return them all — no trimming needed
  if (messages.length <= 2) {
    return [{ role: 'system', content: systemContent }].concat(firstExchange);
  }

  // --- Step 2: fill from the end (most recent messages) ---
  const recentMessages = [];
  for (let i = messages.length - 1; i >= firstExchange.length; i--) {
    const msgChars = messages[i].content.length;
    if (totalChars + msgChars > budget) break;
    totalChars += msgChars;
    recentMessages.unshift(messages[i]);
  }

  // Always include at least the latest message
  if (recentMessages.length === 0) {
    const last = messages[messages.length - 1];
    const maxLen = Math.max(200, budget - totalChars);
    recentMessages.push({
      role: last.role,
      content: last.content.slice(0, maxLen),
    });
  }

  // --- Step 3: detect if middle messages were dropped ---
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
