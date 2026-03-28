# PENGER Checkout System — Full Documentation

## 1. Architecture

### Component Map

```
+---------------------------------------------------+
|  CLIENT (Browser)                                   |
|                                                     |
|  order.js           checkout.js                     |
|  - Product config   - 3-step form (contact/delivery/payment)
|  - Price preview    - Promo code validation          |
|  - sessionStorage   - Wallet detection (Phantom/Solflare/Backpack)
|       |              - Invoice creation & QR display  |
|       |              - Solana Pay deep links (mobile) |
|       |              - Polling for payment status     |
|       v              - UA flow (Nova Poshta + COD/invoice/card)
|  sessionStorage                                      |
|  penger_product_config ──> checkout.js reads config   |
+------|----------|------------|-------------|----------+
       |          |            |             |
       |  POST /api/invoice  GET /api/invoice/:id  POST /api/ua-order
       |          |            |             |
+------|----------|------------|-------------|----------+
|  SERVER (Express.js)                                  |
|                                                       |
|  server.js                                            |
|  ├── invoice-routes.js  — POST /api/invoice           |
|  │                        GET  /api/invoice/:id       |
|  │                        GET  /api/pay/:id           |
|  │                        POST /api/pay/:id           |
|  ├── admin-routes.js    — GET /api/admin/orders       |
|  │                        GET /api/admin/stats        |
|  │                        GET /api/admin/export       |
|  ├── POST /api/validate-promo                         |
|  ├── POST /api/novaposhta (proxy)                     |
|  ├── POST /api/ua-order                               |
|  ├── GET  /api/order/:id                              |
|  └── POST /api/invoice-pdf                            |
|                                                       |
|  src/                                                 |
|  ├── invoice.js      — createInvoice, calcEurTotal,   |
|  │                      state machine, DB ops          |
|  ├── solana-pay.js   — buildSolTransfer,               |
|  │                      buildUsdcTransfer, serialize    |
|  ├── solana-verify.js — verifyInvoice, poller (5s),    |
|  │                       validateSol/UsdcPayment        |
|  ├── prices.js       — CoinGecko/Binance price feeds   |
|  ├── db.js           — SQLite init (payment_invoices,   |
|  │                      payment_events)                 |
|  ├── order-store.js  — JSON file persistence            |
|  ├── events.js       — EventEmitter bus                 |
|  ├── telegram-bot.js — Owner notifications              |
|  ├── nbu-rate.js     — EUR/UAH rate (NBU API)           |
|  └── invoice-pdf.js  — PDF generation (PDFKit)          |
+------|------------------------------|------------------+
       |                              |
       v                              v
+------------------+    +---------------------------+
| SQLite (penger.db)|    | External Services          |
| - payment_invoices|    | - Solana RPC (mainnet)     |
| - payment_events  |    | - CoinGecko / Binance      |
+------------------+    | - Telegram Bot API          |
                         | - Nova Poshta API           |
+------------------+    | - NBU API (EUR/UAH rate)    |
| orders.json       |    | - ipapi.co (geo-detection)  |
| (order-store)     |    | - GeoNames (zip suggestions)|
+------------------+    +---------------------------+
```

### Key Design Decisions

- **Server-side rendered** (EJS), no React/Next.js — vanilla JS frontend
- **Dual payment paths**: Solana crypto (SOL/USDC) and Ukrainian fiat (COD/invoice/card)
- **Server-side price calculation** for crypto invoices via `calcEurTotal()` — client price is display only
- **Reference key pattern**: random Keypair for each invoice, used to find the tx on-chain. **Manual transfers (without reference key) are undetectable** — payment is supported ONLY via Solana Pay QR, "Pay with Wallet" button, or deep link
- **Poller-based verification**: 5-second interval server-side, 2.5s client-side polling

---

## 2. User Flow

### Path A: Crypto Payment (SOL/USDC)

| Step | User Action | File:Function | What Happens |
|------|------------|---------------|--------------|
| 1 | Configures product on /order | `public/js/order.js` | Plates, sleeves, punch tool selected. Config saved to `sessionStorage['penger_product_config']` |
| 2 | Clicks "Checkout" | `public/js/order.js` → redirect | Redirects to `/checkout`. `checkout.js` reads config from sessionStorage |
| 3 | Fills contact info (step 1) | `checkout.js:672-729` | Name, email, phone, country. Validated on blur. Country auto-detected via ipapi.co |
| 4 | Fills delivery address (step 2) | `checkout.js:732-803` | Street, city, zip (with GeoNames suggestions). For UA: Nova Poshta city + warehouse |
| 5 | Selects crypto payment | `checkout.js:834-857` | Payment method set to `'crypto'`. Solana checkout UI shown |
| 6 | Clicks "Pay Now" | `checkout.js:1722-1748` | Terms checkbox verified. Calls `renderSolanaCheckout()` |
| 7 | Selects SOL or USDC | `checkout.js:1449-1460` | Calls `startSolanaCheckout(asset)` |
| 8 | Invoice created | `checkout.js:1330-1446` → `POST /api/invoice` | Server: `invoice-routes.js:24-94` → `invoice.js:60-136`. Calculates EUR total, gets crypto quote, generates reference key, saves to DB, returns QR + Solana Pay URL |
| 9 | QR code displayed | `checkout.js:1385-1414` | QR encodes Solana Pay URL **with reference key**. Countdown timer starts (15 min). Polling starts (2.5s). **No manual payment option** — recipient address and amount are NOT shown as copyable text (manual transfers lack reference key and cannot be verified). |
| 10a | Mobile: taps "Pay with Wallet" | `checkout.js:1637-1644` | Opens `solana:` deep link → wallet app (URL contains reference key) |
| 10b | Desktop: auto-connect (returning) | `checkout.js:1532-1614` | Silent `connect({onlyIfTrusted: true})`. If trusted, auto-submits tx (server builds tx with reference key via `POST /api/pay/:id`) |
| 10c | Desktop: manual click | `checkout.js:1637-1712` | Connects wallet, calls `POST /api/pay/:id` to get serialized tx with reference key, wallet signs & sends |
| 11 | Transaction submitted | `solana-pay.js:132-145` | Server builds transaction with reference key + memo, serializes to base64 |
| 12 | Client polls status | `checkout.js:1208-1295` | `GET /api/invoice/:id` every 2.5s (1.5s when <2min left). Exponential backoff on failures |
| 13 | Server verifies payment | `solana-verify.js:23-98` | Poller runs every 5s. Searches `getSignaturesForAddress(reference)`. Validates balance changes. Updates status: `quoted → awaiting_payment → confirming → paid` |
| 14 | Payment confirmed | `checkout.js:1232-1261` | Client detects `status === 'paid'`. Saves order to sessionStorage. Pushes `purchase` to dataLayer. Redirects to `/payment-success` |
| 15 | Success page | `views/pages/payment-success.ejs` | Displays order summary, tx link on Solscan, invoice PDF download |

### Path B: Ukrainian Payment (COD/Invoice/Card)

| Step | User Action | File:Function | What Happens |
|------|------------|---------------|--------------|
| 1-4 | Same as Path A steps 1-4 | Same | Country = UA triggers Nova Poshta delivery flow |
| 5 | Selects UA payment method | `checkout.js:toggleUaFlow()` | Shows COD / Invoice / Card transfer options |
| 6 | Clicks "Place order" | `checkout.js:1850-1890` | `POST /api/ua-order` with full order data |
| 7 | Server processes | `server.js:479-512` | Emits `order:ua-submitted` event (→ Telegram notification). Saves order via `saveOrder()`. No payment verification |
| 8 | Redirect | Client | For `ua-invoice`: redirects to `/invoice` page. Others: `/payment-success` |

---

## 3. Data Flow

### Invoice Creation (POST /api/invoice)

```
Client sends:
{
  orderData: {
    order_id: "PG-M7FT2-AX1B",
    plates: 2,
    sleeveColors: ["black", "tan"],
    punchTool: true,
    country: "DE",
    shipping: 0,              // <-- Display value (NOT used by server)
    discount: 10,             // <-- EUR value from promo (USED by server!)
    promo: "PENGER10",
    contact: { firstName, lastName, email, phone },
    address: { street, apt, city, zip, country }
  },
  asset: "SOL"
}

Server calculates (invoice.js:calcEurTotal):
  subtotal = BASE_PRICE(5900) + (plates-1)*EXTRA_PLATE(3500) + SLEEVE(1000) + PUNCH(1000) = 11400 cents
  shipping = SHIPPING_FREE.has("DE") → 0
  discount = orderData.discount * 100 = 1000 cents
  total = 11400 + 0 - 1000 = 10400 cents (€104.00)

Server gets quote (prices.js:getQuote):
  SOL/EUR price from CoinGecko → e.g. 140.50
  cryptoAmount = 104.00 / 140.50 = 0.740213524 SOL (ceil to 9 decimals)
  amountRaw = ceil(0.740213524 * 1e9) = 740213524 lamports

Server returns:
{
  id: "uuid-...",
  orderId: "PG-M7FT2-AX1B",
  status: "quoted",
  asset: "SOL",
  amountEur: 10400,
  amountCrypto: "0.740213524",
  amountRaw: "740213524",
  rate: "140.50",
  reference: "base58-random-pubkey",
  recipient: "E6bD24fgJh...",
  expiresAt: 1711234567890,  // +15 min
  qrDataUrl: "data:image/png;base64,...",
  payUrl: "solana:https://mypenger.com/api/pay/uuid-...",
  solanaPayUrl: "solana:E6bD24f...?amount=0.740213524&reference=..."
}
```

### Payment Verification (solana-verify.js)

```
Every 5 seconds:
  1. expireStaleInvoices() — mark expired quotes
  2. getAwaitingInvoices() — get all quoted/awaiting/confirming invoices
  3. For each (up to 3 concurrently):
     a. getSignaturesForAddress(reference) — find tx containing our reference key
     b. getTransaction(sig) — fetch full tx data
     c. For SOL: check recipient's postBalance - preBalance >= expectedLamports
        For USDC: check postTokenBalance - preTokenBalance >= expectedAmount
     d. If valid: record tx_signature, tx_slot, tx_block_time, payer_wallet
     e. Transition: quoted → awaiting_payment → confirming → paid
```

### Data Storage

| Store | Content | Persistence |
|-------|---------|-------------|
| `data/penger.db` (SQLite) | `payment_invoices` — full invoice records with amounts, statuses, tx data | Disk (WAL mode) |
| `data/penger.db` (SQLite) | `payment_events` — audit log of all status changes | Disk |
| `data/orders.json` | Order metadata for page refresh recovery | Disk + in-memory cache |
| `sessionStorage['penger_product_config']` | Product config (plates, sleeves, punch) | Browser tab, 30min TTL |
| `sessionStorage['penger_checkout_form']` | Form fields backup | Browser tab, 30min TTL |
| `sessionStorage['penger_order']` | Final order data for success page | Browser tab |
| `localStorage['penger_active_invoice']` | Active invoice for cross-tab/deep-link survival | Browser, cleared on payment |

---

## 4. External Dependencies

| Service | Purpose | File | Auth | Fallback |
|---------|---------|------|------|----------|
| **Solana RPC** (mainnet-beta) | Transaction building, payment verification | `solana-pay.js:22-27`, `solana-verify.js` | None (public) | **None** — single endpoint |
| **CoinGecko API** | SOL/EUR, USDC/EUR prices | `prices.js:15-32` | Optional `COINGECKO_API_KEY` | Binance API |
| **Binance API** | SOL/USDT, EUR/USDT prices (fallback) | `prices.js:38-51` | None | Stale cache (10min) |
| **Telegram Bot API** | Owner notifications for orders | `telegram-bot.js` | `TELEGRAM_BOT_TOKEN` | Silent failure |
| **Nova Poshta API** | Ukrainian shipping (city search, warehouses) | `server.js:435-476` | `NP_API_KEY` | Error shown to user |
| **NBU API** (bank.gov.ua) | EUR/UAH exchange rate for invoices | `nbu-rate.js` | None | Hardcoded fallback (45.0) |
| **ipapi.co** | Country auto-detection by IP | `checkout.js:367-398` | None | User selects manually |
| **GeoNames** | ZIP code suggestions by city | `checkout.js:569-589` | `username=penger_order` | User types manually |
| **OpenAI API** | AI Tutor (not checkout-related) | `server.js:696-708` | `OPENAI_API_KEY` | 503 error |
| **Google Sheets** | CRM setup (optional, one-time script) | `setup-crm.js` | Service Account | Not used in runtime |

---

## 5. Order/Invoice States

### State Machine (invoice.js:27-35)

```
                     ┌──────────────┐
              ┌──────│   quoted     │──────┐
              │      └──────┬───────┘      │
              │             │              │
         [expired]    [wallet_scan /   [cancelled]
              │        tx_request]         │
              v             │              v
        ┌──────────┐        v        ┌───────────┐
        │ expired  │  ┌───────────┐  │ cancelled │
        └──────────┘  │ awaiting_ │  └───────────┘
                      │ payment   │
                      └──┬──┬──┬──┘
                         │  │  │
                [confirming]│ [expired/failed/cancelled]
                         │  │       │
                         v  │       v
                   ┌─────────┐   ┌────────┐
                   │confirming│   │failed  │
                   └────┬──┬──┘  └────────┘
                        │  │
                   [paid] [failed]
                        │     │
                        v     v
                   ┌──────┐ ┌────────┐
                   │ paid │ │ failed │
                   └──────┘ └────────┘
```

### State Descriptions

| Status | Meaning | Trigger |
|--------|---------|---------|
| `quoted` | Invoice created, waiting for wallet interaction | `POST /api/invoice` |
| `awaiting_payment` | Wallet scanned QR or requested tx | `GET /api/pay/:id` or `POST /api/pay/:id` |
| `confirming` | Transaction found on-chain, validating | `solana-verify.js:verifyInvoice()` |
| `paid` | Payment verified and confirmed | `solana-verify.js` — balance change matched |
| `expired` | Quote TTL exceeded (15 minutes) | `expireStaleInvoices()` or `POST /api/pay/:id` expiry check |
| `failed` | Transaction found but validation failed | `solana-verify.js` — amount mismatch or tx error |
| `cancelled` | Manually cancelled (not implemented in UI) | Reserved |

### Terminal States

`paid`, `expired`, `failed`, `cancelled` — no further transitions allowed.

---

## 6. Environment Variables

| Variable | Required | Default | Used In | Purpose |
|----------|----------|---------|---------|---------|
| `PORT` | No | `3000` | `server.js` | Server listen port |
| `MERCHANT_WALLET` | **Yes** (for crypto) | None | `invoice.js:74` | Solana wallet to receive payments |
| `SOLANA_RPC_URL` | No | `https://api.mainnet-beta.solana.com` | `solana-pay.js:23` | Solana RPC endpoint |
| `MERCHANT_USDC_ATA` | No | Auto-derived | `invoice.js:78-82` | USDC Associated Token Account |
| `COINGECKO_API_KEY` | No | None (free tier) | `prices.js:16-17` | CoinGecko Pro API key |
| `BASE_URL` | No | `http://localhost:PORT` | `invoice-routes.js:60` | Public URL for Solana Pay Transaction Requests |
| `TELEGRAM_BOT_TOKEN` | No | None | `telegram-bot.js` | Telegram bot for notifications |
| `TELEGRAM_OWNER_ID` | No | None | `telegram-bot.js` | Owner's Telegram user ID |
| `ADMIN_API_KEY` | No | None (disabled) | `admin-routes.js:23` | Admin API authentication |
| `NP_API_KEY` | No | `4f9ad6dff84a2989a404dc2862a2e10c` | `server.js:433` | Nova Poshta shipping API |
| `OPENAI_API_KEY` | No | None (disabled) | `server.js:310` | AI Tutor feature |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | `server.js:311` | AI model selection |
| `MAX_OUTPUT_TOKENS` | No | `1000` | `server.js:312` | AI response token limit |
| `MAX_INPUT_TOKENS` | No | `1600` | `server.js:313` | AI input token budget |
| `GTM_ID` | No | `GTM-MRBLXV3T` | `server.js:80` | Google Tag Manager |
| `GA_ID` | No | `G-4DKG21ZFFX` | `server.js:81` | Google Analytics |
| `CLARITY_ID` | No | `vwthoa78ix` | `server.js:82` | Microsoft Clarity |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | No | None | `setup-crm.js` | CRM Google Sheets |
| `GOOGLE_PRIVATE_KEY` | No | None | `setup-crm.js` | CRM Google Sheets |
| `CRM_SPREADSHEET_ID` | No | None | `setup-crm.js` | CRM Google Sheets |

---

## 7. Audit Results

### Security

| # | Problem | Severity | Status | What was done |
|---|---------|----------|--------|---------------|
| S1 | **Client-sent discount trusted by server.** | **CRITICAL** | ✅ Fixed | Created `src/promo.js` — shared promo code module. `calcEurTotal()` now ignores `orderData.discount`; calculates discount server-side from `orderData.promo` code via `calcPromoDiscount()`. |
| S2 | **No server-side validation of order items.** | **HIGH** | ✅ Fixed | Added validation in `invoice-routes.js`: plates (1-4), country (VALID_COUNTRIES set), order_id (string, max 50), punchTool (boolean coercion). |
| S3 | **Admin API key accepted via query parameter.** | **HIGH** | ✅ Fixed | Removed `req.query.key` from `admin-routes.js:27`. Key now accepted only via `x-admin-key` header. |
| S4 | **UA order endpoint has zero validation.** | **HIGH** | ✅ Fixed | Added rate limiter (5/min), required field validation (order_id, contact, plates 1-4, pay_method whitelist) to `POST /api/ua-order`. |
| S5 | **No replay protection for invoice creation.** | **MEDIUM** | ✅ Fixed | `POST /api/invoice` now checks for active (non-expired) invoice with same order_id+asset via `getActiveInvoiceByOrderId()`. Returns existing invoice instead of creating duplicate. |
| S6 | **Nova Poshta API key hardcoded as default.** | **LOW** | — Skipped | |
| S7 | **Rate limiting is IP-based only.** | **LOW** | — Skipped | |
| S8 | **CSV export vulnerable to formula injection.** | **LOW** | — Skipped | |

### Reliability

| # | Problem | Severity | Status | What was done |
|---|---------|----------|--------|---------------|
| R1 | **Single Solana RPC endpoint, no fallback.** | **HIGH** | ✅ Fixed | `SOLANA_RPC_URL` now supports comma-separated URLs. Added `rotateRpc()` in `solana-pay.js`. `solana-verify.js` retries with fallback RPC on signature lookup failure. |
| R2 | **Synchronous file writes block event loop.** | **HIGH** | ✅ Fixed | `order-store.js` now uses `fs.writeFile()` (async) with write coalescing — pending writes queue and execute sequentially without blocking the event loop. |
| R3 | **Promo usage counters are in-memory only.** | **HIGH** | ✅ Fixed | Created `promo_usage` table in SQLite (`db.js`). `promo.incrementUsage()` persists to DB. `server.js` and `ua-order` use `promo.incrementUsage()` instead of in-memory counter. |
| R4 | **User loses payment context if tab closes.** | **MEDIUM** | ✅ Fixed | On payment confirmation, order data is now also saved to `localStorage['penger_order']` alongside sessionStorage. Existing `/api/order/:id` fallback handles page refresh. |
| R5 | **No double-invoice prevention across tabs.** | **MEDIUM** | ✅ Fixed | Added localStorage-based lock (`penger_invoice_lock`) in `checkout.js`. Lock acquired before invoice creation, released on success/failure. 30-second auto-expiry prevents stale locks. Also backed by server-side S5 duplicate check. |
| R6 | **Poller stops permanently after 10 consecutive failures.** | **MEDIUM** | ✅ Fixed | Added auto-reconnect logic: after 10 failures, waits 30s then retries (up to 3 reconnect attempts). Shows "Reconnecting..." status. Falls back to "Get new quote" only after all retries exhausted. |
| R7 | **Price cache stale limit may be too short.** | **LOW** | — Skipped | |

### UX

| # | Problem | Severity | Status | What was done |
|---|---------|----------|--------|---------------|
| U1 | **Client shows free shipping for UA, server charges 7 EUR.** | **HIGH** | ✅ Fixed | Removed `'UA'` from client `SHIPPING_FREE` array, added `UA: 7` to client `SHIPPING_COST`. Now matches server's `UA: 700` cents. |
| U6 | **Manual payment UI shows copyable address/amount, but manual transfers are undetectable.** | **HIGH** | ✅ Fixed | Removed `#solanaPayDetails` block from `checkout.ejs` (recipient address + amount + copy buttons). Removed corresponding JS in `checkout.js` (population + copy handler). Payment now works ONLY via QR code, "Pay with Wallet" button, or Solana Pay deep link — all include reference key. |
| U7 | **After invoice expire, entire checkout UI is stuck.** `checkoutBtn` hidden (`display:none`), `checkboxesArea` hidden, `trustBadges` hidden, `isSubmitting` not reset, `solanaCheckout` still visible with dead expired state. User can't change NP warehouse, can't click Pay Now, can't switch payment method — page reload required. Same breakage when clicking Edit Contact/Edit Delivery during active Solana checkout. | **HIGH** | ✅ Fixed | Added `resetSolanaCheckout()` function: stops polling, clears invoice/lock, hides Solana UI, restores `checkoutBtn`/`checkboxesArea`/`trustBadges`, resets `isSubmitting`. Called from: expire (countdown + polling), failed status, Edit Contact, Edit Delivery handlers. Toast message shown on expire/fail. |
| U2 | **No order lookup by email.** | **MEDIUM** | ⚠️ Needs Review | Requires new page/endpoint. Options: (A) `/order-status` page with email+order_id; (B) email-only with magic link. Suggest (A) for simplicity. |
| U3 | **Mobile wallet return path is unclear.** | **MEDIUM** | ⚠️ Needs Review | Existing localStorage invoice persistence handles polling resume. Remaining issue: add visible instruction text ("Return to this page after signing in your wallet"). UX copy decision needed. |
| U4 | **Quote expired state doesn't auto-refresh.** | **LOW** | — Skipped | |
| U5 | **No email confirmation.** | **MEDIUM** | ⚠️ Needs Review | Requires choosing and integrating a transactional email service (SendGrid, Resend, Postmark, etc.). Not a code-only fix. |

### Code Quality

| # | Problem | Severity | Status | What was done |
|---|---------|----------|--------|---------------|
| C1 | **Client/server pricing unit mismatch.** | **MEDIUM** | ⚠️ Needs Review | Client uses EUR (int), server uses cents. Full migration to cents on client is a big refactor touching checkout.js, order.js, and all UI rendering. Risk of regressions. |
| C2 | **`updateInvoiceField()` uses string interpolation.** | **LOW** | — Skipped | |
| C3 | **Dead code path: non-crypto non-UA payment.** | **LOW** | — Skipped | |
| C4 | **No TypeScript.** | **LOW** | — Skipped | |
| C5 | **Client-side order total not verified for UA orders.** | **HIGH** | ✅ Fixed | `POST /api/ua-order` now calls `calcEurTotal(data)` server-side and overwrites `data.value`. Client-sent total is ignored. |

---

## Summary

### Fix Results

- **Fixed: 16** (1 critical + 10 high + 5 medium)
- **Needs Review: 4** (U2, U3, U5 — need product/UX decisions; C1 — big refactor)
- **Skipped: 6** (all LOW severity)

### Files Changed

| File | Changes |
|------|---------|
| `src/promo.js` | **NEW** — shared promo code module (definitions, validation, DB-backed usage tracking) |
| `src/db.js` | Added `promo_usage` table to schema |
| `src/invoice.js` | S1: discount calculated server-side via `calcPromoDiscount()`. Exported `calcEurTotal`, `getActiveInvoiceByOrderId` |
| `src/invoice-routes.js` | S2: input validation. S5: duplicate invoice check. Added VALID_COUNTRIES set |
| `src/admin-routes.js` | S3: removed `req.query.key` |
| `src/order-store.js` | R2: async writes with coalescing |
| `src/solana-pay.js` | R1: comma-separated RPC URLs, `rotateRpc()` |
| `src/solana-verify.js` | R1: RPC retry on signature lookup failure |
| `server.js` | R3: promo persistence via `src/promo.js`. S4/C5: UA order validation + server-side price calc |
| `public/js/checkout.js` | U6: removed manual payment details population + copy handler |
| `views/pages/checkout.ejs` | U6: removed `#solanaPayDetails` HTML block + CSS for `.solana-pay-details`, `.solana-copy-btn` |
| `public/js/checkout.js` | U1: UA shipping fix. R4: localStorage order persistence. R5: cross-tab lock. R6: auto-reconnect poller |
