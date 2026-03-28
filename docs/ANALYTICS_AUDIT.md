# Аудит аналитики PENGER

## Дата аудита: 2026-03-28

## Используемые провайдеры

| Провайдер | Тип | ID / переменная | Файл инициализации |
|-----------|-----|------------------|--------------------|
| Google Tag Manager | Tag Manager | `GTM_ID` (default: `GTM-MRBLXV3T`) | `views/partials/gtm-head.ejs:3-9` |
| Google Analytics 4 | Аналитика (через GTM) | `GA_ID` (default: `G-4DKG21ZFFX`) | `server.js:81` |
| Microsoft Clarity | Session Replay | `CLARITY_ID` (default: `vwthoa78ix`) | `views/partials/head.ejs:7-11` |
| Meta Pixel | Маркетинг (через GTM) | Настроен в GTM | — |
| Google Ads | Маркетинг (через GTM) | Настроен в GTM | — |

**Архитектура:** Все клиентские события пушатся в `window.dataLayer`. GTM слушает dataLayer и маршрутизирует события в GA4, Meta Pixel, Google Ads и др. Прямых вызовов `gtag()`, `fbq()` нет — всё через dataLayer → GTM.

**Consent Management:** Реализован в `views/partials/cookie-banner.ejs`. По умолчанию consent denied. Категории: Necessary (всегда), Analytics, Marketing.

---

## Клиентский аналитический слой

**Основной файл:** `public/analytics.js` (616 строк)

**Функция-обёртка:** `push(event, extra)` — добавляет `page_type`, `device_type`, `scroll_depth` к каждому событию и пушит в `window.dataLayer`.

**Хелперы:**
- `getPageType()` — определяет тип страницы по URL (`landing`, `guide`, `order`, `checkout`, `thank_you`, `payment_failed` и др.)
- `getDeviceType()` — mobile (<768px) / tablet (<1024px) / desktop
- `getScrollPercent()` — текущий % скролла
- `getSectionFromElement(el)` — находит ближайший `[data-section]` или `section[id]`

---

## Реестр существующих событий

### События из `public/analytics.js`

| # | Event Name | Файл:строка | Параметры | Действие пользователя | Страница/Компонент |
|---|-----------|-------------|-----------|----------------------|-------------------|
| 1 | `page_view` | `analytics.js:73` | page_type, device_type, scroll_depth | Загрузка страницы | Все страницы (26 шт. подключают analytics.js) |
| 2 | `scroll_25` | `analytics.js:86` | scroll_depth: 25 | Скролл до 25% | Все |
| 3 | `scroll_50` | `analytics.js:86` | scroll_depth: 50 | Скролл до 50% | Все |
| 4 | `scroll_75` | `analytics.js:86` | scroll_depth: 75 | Скролл до 75% | Все |
| 5 | `scroll_90` | `analytics.js:86` | scroll_depth: 90 | Скролл до 90% | Все |
| 6 | `fast_scroll` | `analytics.js:112` | scroll_velocity | Скролл > 1500px/сек | Все |
| 7 | `slow_scroll` | `analytics.js:117` | scroll_velocity | Скролл 0-300px/сек | Все |
| 8 | `time_30s` | `analytics.js:128` | time_seconds: 30 | 30 сек на странице | Все |
| 9 | `time_60s` | `analytics.js:128` | time_seconds: 60 | 60 сек на странице | Все |
| 10 | `time_120s` | `analytics.js:128` | time_seconds: 120 | 120 сек на странице | Все |
| 11 | `view_section` | `analytics.js:148` | page_section | Секция видна 50% >= 1 сек | Главная (9 секций: hero, problem, social-proof, benefits, how-it-works, encoding-guide, manifesto, pricing, footer) |
| 12 | `view_offer` | `analytics.js:173` | page_section, offer_id, product_id | Оффер виден 50% >= 1 сек | Главная (data-track-offer) |
| 13 | `cta_visible` | `analytics.js:199` | cta_id, cta_text, placement | CTA виден 50% >= 1 сек | Все элементы с [data-track] |
| 14 | `cta_hover` | `analytics.js:220` | cta_id, cta_text, page_section | Наведение на CTA | Все элементы с [data-track] |
| 15 | `cta_click` | `analytics.js:245` | page_section, cta_id, cta_text, offer_id, product_id, placement | Клик по CTA (data-track="cta_click") | Главная, Contacts |
| 16 | `buy_click` | `analytics.js:245` | (то же) | Клик "Купить" (data-track="buy_click") | Главная (hero, pricing) |
| 17 | `kit_order_click` | `analytics.js:245` | (то же) | Клик "Заказать комплект" | Главная (benefits) |
| 18 | `continue_to_checkout` | `analytics.js:245` | (то же) | Клик "Продолжить" на /order | Order |
| 19 | `product_image_view` | `analytics.js:245` | (то же) | Клик по изображению продукта | Главная, Order |
| 20 | `config_plates` | `analytics.js:245` | (то же) | Клик по выбору пластин | Order |
| 21 | `messenger_click` | `analytics.js:256` | page_section, cta_id, cta_text, outbound_url | Клик по ссылке Telegram | Contacts, любая страница с t.me ссылками |
| 22 | `outbound_click` | `analytics.js:267` | page_section, outbound_url, link_text | Клик по внешней ссылке | Все |
| 23 | `faq_expand` | `analytics.js:284` | page_section, content_name | Открытие FAQ-вопроса (.faq-q-btn) | Любая страница с FAQ |
| 24 | `pricing_expand` | `analytics.js:296` | page_section, content_id, content_name | Раскрытие pricing блока | Любая страница с [data-track-pricing] |
| 25 | `video_start` | `analytics.js:313` | page_section, content_id | Старт видео | Любая страница с `<video>` |
| 26 | `video_progress` | `analytics.js:328` | page_section, content_id, video_percent | Прогресс видео 25/50/75/90% | Любая страница с `<video>` |
| 27 | `form_start` | `analytics.js:349` | form_id, page_section | Фокус на поле формы | Формы с [data-form-id] |
| 28 | `form_submit` | `analytics.js:357` | form_id, page_section | Отправка формы | Формы с [data-form-id] |
| 29 | `nav_click` | `analytics.js:370` | link_url, link_text | Клик по навигации | Header nav |
| 30 | `nav_hover` | `analytics.js:387` | link_url, link_text | Наведение на навигацию >= 500мс | Header nav |
| 31 | `product_image_hover` | `analytics.js:413` | page_section, product_id | Наведение на изображение продукта >= 500мс | Главная (.lp-hero-image, .lp-plate-stage, .lp-cta-product) |
| 32 | `checkout_start` | `analytics.js:431` | product_id, page_section, cta_id | Клик по ссылке на /order | Все страницы (делегирование на `a[href*="/order"]`) |
| 33 | `view_item` | `analytics.js:464` | ecommerce {currency, value, items[]} | Загрузка страницы /order | Order |
| 34 | `purchase` | `analytics.js:481` | order_id, ecommerce {transaction_id, value, currency, shipping, items[]} | Загрузка /payment-success | Payment Success |
| 35 | `generate_lead` | `analytics.js:493` | order_id, value, currency, lead_source, config_* | Загрузка /payment-success | Payment Success |
| 36 | `payment_success` | `analytics.js:505` | order_id, product_id, value, currency | Загрузка /payment-success (legacy) | Payment Success |
| 37 | `checkout_error` | `analytics.js:523` | order_id, value, currency, config_*, product_id | Загрузка /payment-failed | Payment Failed |
| 38 | `exit_intent` | `analytics.js:544` | page_section | Курсор выходит за верх экрана (Y <= 10px) | Все (desktop only) |
| 39 | `text_select` | `analytics.js:563` | page_section, selected_length | Выделение текста > 15 символов | Все |
| 40 | `copy_text` | `analytics.js:577` | page_section, copied_length | Копирование текста > 15 символов | Все |
| 41 | `rage_click` | `analytics.js:605` | page_section, element_tag, element_class | 3+ клика за 1 сек по одному элементу | Все |

### События из `public/js/order.js`

| # | Event Name | Файл:строка | Параметры | Действие пользователя | Страница |
|---|-----------|-------------|-----------|----------------------|----------|
| 42 | `config_change` | `order.js:427` | config_action (plates_change\|sleeve_change\|punch_change), config_plates, config_total, product_id, page_section | Изменение конфигурации продукта | Order |

### События из `public/js/checkout.js`

| # | Event Name | Файл:строка | Параметры | Действие пользователя | Страница |
|---|-----------|-------------|-----------|----------------------|----------|
| 43 | `begin_checkout` | `checkout.js:1840` | order_id, ecommerce {currency, value, coupon, items[]}, config_plates, config_pay_method, page_section | Отправка формы чекаута | Checkout |
| 44 | `checkout_start` | `checkout.js:1863` | order_id, product_id, config_plates, value, currency, coupon, discount, referral_code, page_section | Отправка формы чекаута (дубль) | Checkout |
| 45 | `purchase` | `checkout.js:1287` | order_id, value, currency, payment_method, transaction_id | Подтверждение крипто-платежа (Solana polling) | Checkout (inline success) |

### События из `views/partials/cookie-banner.ejs`

| # | Event Name | Файл:строка | Параметры | Действие пользователя | Страница |
|---|-----------|-------------|-----------|----------------------|----------|
| 46 | `consent_accept_all` | `cookie-banner.ejs:122` | consent_analytics, consent_marketing, consent_version | Принятие всех cookies | Все |
| 47 | `consent_reject_all` | `cookie-banner.ejs:122` | consent_analytics, consent_marketing, consent_version | Отклонение всех cookies | Все |
| 48 | `consent_update` | `cookie-banner.ejs:122` | consent_analytics, consent_marketing, consent_version | Кастомный выбор cookies | Все |

### Серверные события (не клиентские — внутренний event bus)

| # | Event Name | Файл:строка | Параметры | Триггер |
|---|-----------|-------------|-----------|---------|
| S1 | `created` | `src/invoice.js` | asset, eurCents, rate, cryptoAmount | Создание инвойса |
| S2 | `awaiting_payment` | `src/invoice.js` | — | Ожидание оплаты |
| S3 | `confirming` | `src/invoice.js` | — | Подтверждение платежа |
| S4 | `paid` | `src/invoice.js` | signature, slot | Платеж получен |
| S5 | `expired` | `src/invoice.js` | — | Инвойс истёк |
| S6 | `failed` | `src/invoice.js` | — | Платеж не прошёл |

---

## Карта страниц и подключение analytics.js

| Страница/Роут | analytics.js подключён |
|--------------|----------------------|
| `/` (index) | ✅ |
| `/order` | ✅ |
| `/checkout` | ✅ |
| `/payment-success` | ✅ |
| `/payment-failed` | ✅ |
| `/guides` | ✅ |
| `/guides/seed-anatomy` | ✅ |
| `/guides/wallet-anatomy` | ✅ |
| `/guides/self-sovereignty` | ✅ |
| `/guides/wallet-comparison` | ✅ |
| `/guides/opsec` | ✅ |
| `/guides/passphrase` | ✅ |
| `/guides/multisig` | ✅ |
| `/guides/hodl` | ✅ |
| `/guides/:slug/quiz` | ✅ |
| `/quiz` | ✅ |
| `/simulators` | ✅ |
| `/dictionary` | ✅ |
| `/ai-tutor` | ✅ |
| `/about-us` | ✅ |
| `/contacts` | ✅ |
| `/dropshipping` | ✅ |
| `/whitepaper` | ✅ |
| `/invoice` | ✅ |
| `/cookie-policy` | ✅ |
| `/404` | ✅ |

**Вывод:** analytics.js подключён на всех 26 страницах. Базовые события (page_view, scroll_*, time_*, exit_intent, text_select, copy_text, rage_click, outbound_click, nav_click) работают глобально.

---

## Карта покрытия страниц

### Легенда
- ✅ Полностью покрыта — есть page_view + события на ключевых элементах
- ⚠️ Частично покрыта — есть page_view и глобальные события, но отсутствуют события на ключевых элементах страницы
- ❌ Минимальное покрытие — только глобальные события из analytics.js, нет ни одного data-атрибута

| Страница/Роут | Статус | Что покрыто | Что отсутствует |
|--------------|--------|------------|----------------|
| `/` (главная) | ✅ | page_view, scroll_*, view_section (9 секций), view_offer, buy_click, cta_click, kit_order_click, product_image_hover, checkout_start, cta_visible/hover | — |
| `/order` | ✅ | page_view, view_item, config_change, product_image_view, config_plates, continue_to_checkout | — |
| `/checkout` | ✅ | page_view, begin_checkout, checkout_start, purchase, form_start/form_submit (2 формы), checkout_step, payment_method_select | — |
| `/payment-success` | ✅ | page_view, purchase, generate_lead, payment_success (legacy) | — |
| `/payment-failed` | ✅ | page_view, checkout_error | — |
| `/contacts` | ✅ | page_view, view_section (5 секций), cta_click (email, scenarios x4, channels, partnership), messenger_click (Telegram x2) | — |
| `/guides` (список) | ✅ | page_view, view_section (7 секций), cta_click (8 guide cards, 8 learning path nodes, start here, quiz CTA) | — |
| `/guides/*` (x8) | ✅ | page_view, view_section (guide-content, guide-intro, guide-faq, guide-previews, guide-quiz-cta), cta_click (quiz CTA, preview cards, nav prev/next), faq_expand | — |
| `/guides/:slug/quiz` | ✅ | page_view, view_section (hero, container), quiz_answer, quiz_complete, cta_click (back to guide) | — |
| `/quiz` | ✅ | page_view, view_section (hero, container), quiz_answer, quiz_complete, cta_click (back to academy) | — |
| `/simulators` | ✅ | page_view, view_section (7 секций), simulator_tab_switch, simulator_generate, cta_click (generate, clear), faq_expand | — |
| `/dictionary` | ✅ | page_view, view_section (3 секции), dictionary_search, cta_click (PDF download) | — |
| `/ai-tutor` | ✅ | page_view, view_section (2 секции), tutor_chat_start, tutor_message_send, tutor_scenario_click, cta_click (send) | — |
| `/about-us` | ✅ | page_view, view_section (9 секций), cta_click (academy, simulators, AI tutor, founder email, dropshipping, explore, contact), messenger_click (founder Telegram) | — |
| `/dropshipping` | ✅ | page_view, view_section (7 секций), cta_click (send email) | — |
| `/whitepaper` | ✅ | page_view, view_section (12 секций) | — (контентная страница без CTA) |
| `/invoice` | ✅ | page_view, view_section, cta_click (download PDF, continue) | — |
| `/cookie-policy` | ✅ | page_view, view_section (hero) | — (информационная страница) |
| `/404` | ✅ | page_view, view_section, cta_click (home, simulators, dictionary) | — |
| Footer (partial) | ✅ | cta_click (7 навигационных ссылок) | — |

---

## Все пробелы закрыты

Все критические, важные и желательные пробелы из первоначального аудита устранены в обновлении от 2026-03-28.

---

## Статистика покрытия

| Метрика | До (2026-03-28) | После (2026-03-28) |
|---------|-----------------|-------------------|
| Всего страниц/роутов | 26 | 26 |
| analytics.js подключён | 26 (100%) | 26 (100%) |
| ✅ Полностью покрыты | 4 (15%) | **26 (100%)** |
| ⚠️ Частично покрыты | 2 (8%) | 0 |
| ❌ Минимальное покрытие | 20 (77%) | 0 |
| Всего уникальных событий (клиент) | 48 | **58** |
| Элементов с data-track | ~15 (4 страницы) | **~150 (31 файл)** |
| Элементов с data-section | ~15 (4 страницы) | **~114 (16 страниц + 16 body файлов)** |
| Форм с data-form-id | 0 из 2 | **2 из 2** |

---

## Изменения 2026-03-28

### Инфраструктурные изменения
- `analytics.js`: `view_section` observer переведён с хардкоженного списка секций на динамический — теперь отслеживает все `[data-section]` на любой странице

### Добавлено по страницам

| Страница | Что добавлено | Затронутые файлы |
|----------|--------------|-----------------|
| `/checkout` | `data-form-id` на 2 формы, `checkout_step` (step 2/3), `payment_method_select` | `views/pages/checkout.ejs`, `public/js/checkout.js` |
| `/contacts` | `data-section` x5, `data-track` x7 (scenarios, channels, partnership) | `views/pages/contacts.ejs` |
| `/guides` (список) | `data-section` x7, `data-track` x18 (guide cards, learning path, quiz CTA) | `views/pages/guides.ejs` |
| `/guides/*` (x8) | `data-section="guide-content"` + `data-guide-slug` на main | 8x `views/guides/*/page.ejs` |
| Guide body files (x16) | `data-section` x4 (intro, faq, previews, quiz-cta), `data-track` на quiz CTA, preview cards, nav links | 16x `views/guides/*/body-{en,uk}.ejs` |
| `/quiz` | `data-section` x2, `quiz_answer`, `quiz_complete`, `data-track` на back link | `views/pages/quiz.ejs` |
| `/guides/:slug/quiz` | `data-section` x2, `quiz_answer`, `quiz_complete`, `data-track` на back link | `views/pages/guide-quiz.ejs` |
| `/simulators` | `data-section` x7, `data-track` x2, `simulator_tab_switch`, `simulator_generate` | `views/pages/simulators.ejs`, `public/script.js` |
| `/dictionary` | `data-section` x3, `data-track` x1, `dictionary_search` (debounced) | `views/pages/dictionary.ejs`, `public/dictionary.js` |
| `/ai-tutor` | `data-section` x2, `data-track` x1, `tutor_chat_start`, `tutor_message_send`, `tutor_scenario_click` | `views/pages/ai-tutor.ejs`, `public/js/ai-tutor.js` |
| `/about-us` | `data-section` x9, `data-track` x8 (edu links, founder, partnership, CTAs) | `views/pages/about-us.ejs` |
| `/dropshipping` | `data-section` x7, `data-track` x1 (email CTA) | `views/pages/dropshipping.ejs` |
| `/whitepaper` | `data-section` x12 | `views/pages/whitepaper.ejs` |
| `/invoice` | `data-section` x1, `data-track` x2 (download, continue) | `views/pages/invoice.ejs` |
| `/404` | `data-section` x1, `data-track` x3 (nav links) | `views/pages/404.ejs` |
| `/cookie-policy` | `data-section` x1 | `views/pages/cookie-policy.ejs` |
| Footer | `data-track` x7 (nav links) | `views/partials/footer.ejs` |

### Новые события (добавлены к существующим 48)
| # | Event Name | Параметры | Страница |
|---|-----------|-----------|----------|
| 49 | `checkout_step` | step_name, step_number, page_section | Checkout |
| 50 | `payment_method_select` | method, page_section | Checkout |
| 51 | `quiz_answer` | quiz_type, question_index, question_topic/guide_slug, level, page_section | Quiz, Guide Quiz |
| 52 | `quiz_complete` | quiz_type, score, total, guide_slug, level, page_section | Quiz, Guide Quiz |
| 53 | `simulator_tab_switch` | tab_name, page_section | Simulators |
| 54 | `simulator_generate` | word_count, page_section | Simulators |
| 55 | `dictionary_search` | search_query, results_count, page_section | Dictionary |
| 56 | `tutor_chat_start` | page_section | AI Tutor |
| 57 | `tutor_message_send` | page_section | AI Tutor |
| 58 | `tutor_scenario_click` | scenario_option, scenario_label, page_section | AI Tutor |
