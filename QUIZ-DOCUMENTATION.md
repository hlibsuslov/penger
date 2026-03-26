# PENGER Academy -- Quiz System: Full Documentation

Complete reference for the quiz subsystem across the PENGER project.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Routes & Server Configuration](#2-routes--server-configuration)
3. [Quiz Types](#3-quiz-types)
4. [File Map](#4-file-map)
5. [Templates (EJS)](#5-templates-ejs)
   - 5.1 Main Knowledge Check (`quiz.ejs`)
   - 5.2 Per-Guide Quiz (`guide-quiz.ejs`)
   - 5.3 Quiz Banner on `/guides` page
   - 5.4 Quiz CTA block inside each guide
6. [Quiz Data (`guide-quiz-data.js`)](#6-quiz-data)
7. [CSS Styles](#7-css-styles)
8. [Localization (i18n)](#8-localization-i18n)
9. [Schema.org / SEO Markup](#9-schemaorg--seo-markup)
10. [Client-Side Logic](#10-client-side-logic)
11. [Accessibility](#11-accessibility)
12. [All 88 Questions Reference](#12-all-88-questions-reference)

---

## 1. Architecture Overview

| Aspect | Detail |
|---|---|
| **Framework** | Express.js + EJS (server-rendered) |
| **Client JS** | Vanilla JavaScript (no frameworks) |
| **State persistence** | None (client-side in-memory arrays). Only `localStorage` for banner dismissal |
| **Database** | No quiz tables -- fully stateless |
| **Languages** | English (`en`) + Ukrainian (`uk`) |
| **Total questions** | 88 (8 main + 80 per-guide) |

**Two independent quiz systems exist:**

1. **Main Knowledge Check** (`/quiz`) -- 8 questions, one per guide topic, single difficulty
2. **Per-Guide Quizzes** (`/guides/:slug/quiz`) -- 10 questions per guide (5 beginner + 5 advanced), dual difficulty toggle

---

## 2. Routes & Server Configuration

### Route: Main Quiz

```
GET /quiz
```

Defined via `PAGE_CONFIGS` in `server.js:230`:

```js
'/quiz': { view: 'pages/quiz', dataKey: 'quiz', css: [], js: [] },
```

Localization data key: `t.quiz`

### Route: Per-Guide Quiz

```
GET /guides/:slug/quiz
```

Defined in `server.js:185-198`:

```js
app.get('/guides/:slug/quiz', function (req, res, next) {
  if (!GUIDE_SLUGS.has(req.params.slug)) return next();
  var t = res.locals.t;
  var quizData = (t.guideQuiz && t.guideQuiz[req.params.slug]) || {};
  res.render('pages/guide-quiz', {
    pageSlug: req.params.slug,
    pageTitle: quizData.title || 'Quiz -- PENGER Academy',
    pageDescription: quizData.metaDescription || '',
    pageKeywords: quizData.keywords || '',
    extraCss: [],
    extraJs: ['js/guide-quiz-data.js'],
    ogType: 'website',
  });
});
```

Valid slugs (from `GUIDE_SLUGS`):
`seed-anatomy`, `wallet-anatomy`, `self-sovereignty`, `wallet-comparison`, `opsec`, `passphrase`, `multisig`, `hodl`

---

## 3. Quiz Types

### 3.1 Main Knowledge Check (`/quiz`)

- **Questions:** 8 (one per guide topic)
- **Difficulty:** Single level
- **Question data:** Embedded directly in `quiz.ejs` (lines 119-216)
- **Features:**
  - Progress bar showing position
  - Topic label badge per question
  - Score circle on results
  - Personalized guide recommendations based on incorrect answers
  - Links to relevant guide pages for weak topics
  - Retake functionality
- **Result tiers:**
  - 8/8: "Excellent Result!"
  - 6+/8: "Good Result!"
  - 4+/8: "Room for Improvement"
  - <4/8: "Time to Learn!"

### 3.2 Per-Guide Quizzes (`/guides/:slug/quiz`)

- **Questions:** 5 per level (beginner + advanced)
- **Difficulty:** Dual level with pill toggle
- **Question data:** External file `public/js/guide-quiz-data.js`
- **Features:**
  - Level switcher (beginner/advanced) with progress-reset confirmation
  - Smooth opacity transitions between questions
  - Deep-link recommendations to specific guide sections via `sectionId`
  - "Try Advanced/Beginner Level" button in results
  - Cross-level promotion (primary button when score is perfect)
  - ARIA-compliant radiogroups and live regions
- **Result tiers:**
  - 5/5 (100%): "Excellent Result!"
  - 4/5 (80%+): "Good Result!"
  - 3/5 (50%+): "Room for Improvement"
  - <3/5 (<50%): "Time to Learn!"
- **URL parameter:** `?level=advanced` initializes at advanced level

---

## 4. File Map

```
penger-main3/
  server.js                                    # Routes (lines 183-198, 230)
  views/
    pages/
      quiz.ejs                                 # Main knowledge check template (351 lines)
      guide-quiz.ejs                           # Per-guide quiz template (351 lines)
      guides.ejs                               # Quiz banner (lines 577-622)
    guides/
      seed-anatomy/body-en.ejs                 # Quiz CTA (line 591)
      seed-anatomy/body-uk.ejs                 # Quiz CTA (line 577)
      wallet-anatomy/body-en.ejs               # Quiz CTA (line 426)
      wallet-anatomy/body-uk.ejs               # Quiz CTA (line 412)
      self-sovereignty/body-en.ejs             # Quiz CTA (line 482)
      self-sovereignty/body-uk.ejs             # Quiz CTA (line 482)
      wallet-comparison/body-en.ejs            # Quiz CTA (line 414)
      wallet-comparison/body-uk.ejs            # Quiz CTA (line 414)
      opsec/body-en.ejs                        # Quiz CTA (line 551)
      opsec/body-uk.ejs                        # Quiz CTA (line 551)
      passphrase/body-en.ejs                   # Quiz CTA (line 471)
      passphrase/body-uk.ejs                   # Quiz CTA (line 471)
      multisig/body-en.ejs                     # Quiz CTA (line 441)
      multisig/body-uk.ejs                     # Quiz CTA (line 441)
      hodl/body-en.ejs                         # Quiz CTA (line 527)
      hodl/body-uk.ejs                         # Quiz CTA (line 512)
  public/
    js/
      guide-quiz-data.js                       # 80 questions (1838 lines)
    style.css                                  # Quiz styles (lines 3409-3659)
  locales/
    en.json                                    # English quiz keys (lines 1166-1235)
    uk.json                                    # Ukrainian quiz keys (lines 1166-1235)
```

---

## 5. Templates (EJS)

### 5.1 Main Knowledge Check -- `views/pages/quiz.ejs`

Full template (351 lines):

```html
<!DOCTYPE html><html lang="<%= lang %>">
<head>
  <%- include('../partials/head') %>
  <% if (typeof extraCss !== 'undefined') { extraCss.forEach(function(css) { %>
  <link rel="stylesheet" href="/<%= css %>">
  <% }); } %>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Quiz",
    "name": "<%= pageTitle %>",
    "url": "<%= canonicalBase %><%= langPrefix %>/quiz",
    "description": "<%= pageDescription %>",
    "publisher": {
      "@type": "Organization",
      "name": "PENGER",
      "logo": { "@type": "ImageObject", "url": "<%= canonicalBase %>/PENGER.svg" }
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "<%= lang === 'uk' ? 'Головна' : 'Home' %>", "item": "<%= canonicalBase %><%= langPrefix %>/" },
      { "@type": "ListItem", "position": 2, "name": "<%= lang === 'uk' ? 'Академія' : 'Academy' %>", "item": "<%= canonicalBase %><%= langPrefix %>/guides" },
      { "@type": "ListItem", "position": 3, "name": "<%= lang === 'uk' ? 'Перевірка знань' : 'Knowledge Check' %>" }
    ]
  }
  </script>
</head>
<body>
  <%- include('../partials/gtm-body') %>
  <noscript><p style="padding:40px;text-align:center;font-size:16px;">JavaScript is required.</p></noscript>
  <%- include('../partials/header') %>

  <main>
    <section class="quiz-hero">
      <div class="container">
        <a href="<%= langPrefix %>/guides" class="quiz-back-link">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 10H4M8 5l-5 5 5 5"/></svg>
          <%= lang === 'uk' ? 'Академія' : 'Academy' %>
        </a>
        <p class="label"><%= lang === 'uk' ? '[ ПЕРЕВІРКА ЗНАНЬ ]' : '[ KNOWLEDGE CHECK ]' %></p>
        <h1 class="quiz-hero-title"><%= lang === 'uk' ? 'Де ваші прогалини в знаннях?' : 'Where Are Your Knowledge Gaps?' %></h1>
        <p class="quiz-hero-desc"><%= lang === 'uk' ? '8 запитань за ~2 хвилини. Визначте теми, які варто вивчити глибше, та отримайте персоналізовані рекомендації гайдів.' : '8 questions in ~2 minutes. Identify topics worth exploring deeper and get personalized guide recommendations.' %></p>
      </div>
    </section>

    <section class="quiz-container">
      <div class="container">

        <!-- QUIZ BODY -->
        <div class="quiz-card" id="quiz-card">
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" id="quiz-progress-fill"></div>
          </div>

          <div class="quiz-question-area" id="quiz-question-area">
            <div class="quiz-question-header">
              <span class="quiz-question-counter" id="quiz-counter"></span>
              <span class="quiz-question-topic" id="quiz-topic"></span>
            </div>
            <p class="quiz-question-text" id="quiz-question-text"></p>
            <div class="quiz-options" id="quiz-options"></div>
          </div>

          <div class="quiz-nav" id="quiz-nav">
            <button class="cb-btn cb-btn--secondary" id="quiz-prev" disabled>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 10H4M8 5l-5 5 5 5"/></svg>
              <%= lang === 'uk' ? 'Назад' : 'Back' %>
            </button>
            <button class="cb-btn cb-btn--primary" id="quiz-next" disabled>
              <%= lang === 'uk' ? 'Далі' : 'Next' %>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h12M12 5l5 5-5 5"/></svg>
            </button>
          </div>
        </div>

        <!-- RESULTS (hidden until complete) -->
        <div class="quiz-results" id="quiz-results" style="display:none;">
          <div class="quiz-results-header">
            <div class="quiz-score-circle" id="quiz-score-circle">
              <span class="quiz-score-num" id="quiz-score-num"></span>
              <span class="quiz-score-label"><%= lang === 'uk' ? 'з 8' : 'of 8' %></span>
            </div>
            <div>
              <h2 class="quiz-results-title" id="quiz-results-title"></h2>
              <p class="quiz-results-desc" id="quiz-results-desc"></p>
            </div>
          </div>

          <div class="quiz-results-guides" id="quiz-results-guides"></div>

          <div class="quiz-results-actions">
            <button class="cb-btn cb-btn--secondary" id="quiz-restart">
              <%= lang === 'uk' ? 'Пройти ще раз' : 'Retake Quiz' %>
            </button>
            <a href="<%= langPrefix %>/guides" class="cb-btn cb-btn--primary">
              <%= lang === 'uk' ? 'До Академії' : 'Go to Academy' %>
            </a>
          </div>
        </div>

      </div>
    </section>
  </main>

  <%- include('../partials/footer') %>

  <script src="/analytics.js"></script>
  <script src="/shared.js?v=3"></script>
  <script>
  (function() {
    var isUk = '<%= lang %>' === 'uk';
    var LP = '<%= langPrefix %>';

    var QUESTIONS = [
      {
        topic: 'seed-anatomy',
        topicLabel: isUk ? 'Сід-фрази' : 'Seed Phrases',
        question: isUk
          ? 'Який стандарт визначає список із 2048 слів для сід-фраз?'
          : 'What standard defines the 2048-word list used for seed phrases?',
        options: isUk
          ? ['BIP32', 'BIP39', 'BIP44', 'EIP-721']
          : ['BIP32', 'BIP39', 'BIP44', 'EIP-721'],
        correct: 1,
        guideTitle: isUk ? 'Анатомія сід-фрази' : 'Anatomy of a Seed Phrase'
      },
      {
        topic: 'wallet-anatomy',
        topicLabel: isUk ? 'Гаманці' : 'Wallets',
        question: isUk
          ? 'Яка основна функція HD-гаманця?'
          : 'What is the primary function of an HD wallet?',
        options: isUk
          ? ['Зберігати паролі', 'Деривувати багато адрес з одного сіда', 'Підключатися до бірж', 'Майнити криптовалюту']
          : ['Store passwords', 'Derive multiple addresses from one seed', 'Connect to exchanges', 'Mine cryptocurrency'],
        correct: 1,
        guideTitle: isUk ? 'Анатомія гаманця' : 'Anatomy of a Wallet'
      },
      {
        topic: 'self-sovereignty',
        topicLabel: isUk ? 'Самосуверенітет' : 'Self-Sovereignty',
        question: isUk
          ? 'Що означає принцип «не твої ключі -- не твої монети»?'
          : 'What does "not your keys, not your coins" mean?',
        options: isUk
          ? ['Потрібні фізичні монети', 'Тільки апаратні гаманці безпечні', 'Без контролю приватних ключів ви не володієте криптою', 'Ключі треба друкувати на папері']
          : ['You need physical coins', 'Only hardware wallets are safe', 'Without controlling private keys you don\'t truly own crypto', 'Keys must be printed on paper'],
        correct: 2,
        guideTitle: isUk ? 'Самосуверенітет' : 'Self-Sovereignty'
      },
      {
        topic: 'wallet-comparison',
        topicLabel: isUk ? 'Типи гаманців' : 'Wallet Types',
        question: isUk
          ? 'Який тип гаманця забезпечує найвищу безпеку для довгострокового зберігання?'
          : 'Which wallet type offers the highest security for long-term storage?',
        options: isUk
          ? ['Мобільний гарячий гаманець', 'Браузерне розширення', 'Ейр-гепд апаратний гаманець', 'Біржовий акаунт']
          : ['Mobile hot wallet', 'Browser extension wallet', 'Air-gapped hardware wallet', 'Exchange account'],
        correct: 2,
        guideTitle: isUk ? 'Порівняння типів гаманців' : 'Wallet Types Compared'
      },
      {
        topic: 'opsec',
        topicLabel: isUk ? 'OpSec' : 'OpSec',
        question: isUk
          ? 'Яка головна мета операційної безпеки (OpSec) у криптовалюті?'
          : 'What is the main goal of operational security (OpSec) in crypto?',
        options: isUk
          ? ['Максимізувати прибуток від трейдингу', 'Мінімізувати вектори атак та захистити приватні ключі', 'Збільшити швидкість транзакцій', 'Зменшити комісії']
          : ['Maximize trading profits', 'Minimize attack surface and protect private keys', 'Increase transaction speed', 'Reduce gas fees'],
        correct: 1,
        guideTitle: isUk ? 'Операційна безпека (OpSec)' : 'Operational Security (OpSec)'
      },
      {
        topic: 'passphrase',
        topicLabel: isUk ? 'Пасфраза' : 'Passphrase',
        question: isUk
          ? 'Що робить пасфраза BIP39 (25-те слово)?'
          : 'What does the BIP39 passphrase (25th word) do?',
        options: isUk
          ? ['Замінює сід-фразу', 'Створює зовсім інший гаманець з того ж сіда', 'Шифрує блокчейн', 'Прискорює транзакції']
          : ['Replaces the seed phrase', 'Creates a completely different wallet from the same seed', 'Encrypts the blockchain', 'Speeds up transactions'],
        correct: 1,
        guideTitle: isUk ? '25-те слово (Пасфраза)' : 'The 25th Word (Passphrase)'
      },
      {
        topic: 'multisig',
        topicLabel: isUk ? 'Мультипідпис' : 'Multisig',
        question: isUk
          ? 'Скільки ключів потрібно для підпису транзакції в схемі 2-з-3 мультипідпису?'
          : 'In a 2-of-3 multisig setup, how many keys are needed to sign a transaction?',
        options: isUk
          ? ['1', '2', '3', 'Усі ключі плюс пароль']
          : ['1', '2', '3', 'All keys plus a password'],
        correct: 1,
        guideTitle: isUk ? 'Мультипідпис (Multisig)' : 'Multisignature (Multisig)'
      },
      {
        topic: 'hodl',
        topicLabel: isUk ? 'HODL' : 'HODL',
        question: isUk
          ? 'Що таке Dollar Cost Averaging (DCA)?'
          : 'What is Dollar Cost Averaging (DCA)?',
        options: isUk
          ? ['Купувати тільки на просадках', 'Інвестувати фіксовану суму через рівні інтервали незалежно від ціни', 'Продавати невеликі суми щодня', 'Конвертувати в стейблкоїни']
          : ['Buying only at market dips', 'Investing a fixed amount at regular intervals regardless of price', 'Selling small amounts daily', 'Converting to stablecoins'],
        correct: 1,
        guideTitle: isUk ? 'HODL: стратегія довгострокового утримання' : 'HODL: The Long-Term Holding Strategy'
      }
    ];

    var currentQ = 0;
    var answers = new Array(QUESTIONS.length).fill(-1);

    var counterEl = document.getElementById('quiz-counter');
    var topicEl = document.getElementById('quiz-topic');
    var questionEl = document.getElementById('quiz-question-text');
    var optionsEl = document.getElementById('quiz-options');
    var progressEl = document.getElementById('quiz-progress-fill');
    var prevBtn = document.getElementById('quiz-prev');
    var nextBtn = document.getElementById('quiz-next');
    var cardEl = document.getElementById('quiz-card');
    var resultsEl = document.getElementById('quiz-results');

    function render() {
      var q = QUESTIONS[currentQ];
      counterEl.textContent = (currentQ + 1) + ' / ' + QUESTIONS.length;
      topicEl.textContent = q.topicLabel;
      questionEl.textContent = q.question;
      progressEl.style.width = ((currentQ + 1) / QUESTIONS.length * 100) + '%';

      optionsEl.innerHTML = '';
      q.options.forEach(function(opt, i) {
        var btn = document.createElement('button');
        btn.className = 'quiz-option' + (answers[currentQ] === i ? ' selected' : '');
        btn.textContent = opt;
        btn.addEventListener('click', function() {
          answers[currentQ] = i;
          render();
        });
        optionsEl.appendChild(btn);
      });

      prevBtn.disabled = currentQ === 0;
      var isLast = currentQ === QUESTIONS.length - 1;
      nextBtn.disabled = answers[currentQ] === -1;
      nextBtn.innerHTML = isLast
        ? (isUk ? 'Результати' : 'See Results') + ' <svg ...>...</svg>'
        : (isUk ? 'Далі' : 'Next') + ' <svg ...>...</svg>';
    }

    prevBtn.addEventListener('click', function() {
      if (currentQ > 0) { currentQ--; render(); }
    });

    nextBtn.addEventListener('click', function() {
      if (answers[currentQ] === -1) return;
      if (currentQ < QUESTIONS.length - 1) {
        currentQ++;
        render();
      } else {
        showResults();
      }
    });

    function showResults() {
      cardEl.style.display = 'none';
      resultsEl.style.display = '';

      var score = 0;
      var weak = [];
      QUESTIONS.forEach(function(q, i) {
        if (answers[i] === q.correct) {
          score++;
        } else {
          weak.push(q);
        }
      });

      document.getElementById('quiz-score-num').textContent = score;

      var titleEl = document.getElementById('quiz-results-title');
      var descEl = document.getElementById('quiz-results-desc');
      var guidesEl = document.getElementById('quiz-results-guides');

      if (score === QUESTIONS.length) {
        titleEl.textContent = isUk ? 'Чудовий результат!' : 'Excellent Result!';
        descEl.textContent = isUk
          ? 'Ви відповіли правильно на всі запитання. Ви добре розумієте основи крипто-самосуверенітету!'
          : 'You answered all questions correctly. You have a solid understanding of crypto self-custody fundamentals!';
        guidesEl.innerHTML = '<p class="quiz-results-all-good">...</p>';
      } else if (score >= 6) {
        titleEl.textContent = isUk ? 'Хороший результат!' : 'Good Result!';
        // ...
      } else if (score >= 4) {
        titleEl.textContent = isUk ? 'Є над чим попрацювати' : 'Room for Improvement';
        // ...
      } else {
        titleEl.textContent = isUk ? 'Саме час навчатись!' : 'Time to Learn!';
        // ...
      }

      if (weak.length > 0) {
        // Renders links to weak guide topics
        weak.forEach(function(q) {
          var a = document.createElement('a');
          a.href = LP + '/guides/' + q.topic;
          a.className = 'quiz-results-guide';
          a.innerHTML = '<span class="quiz-results-guide-title">' + q.guideTitle + '</span>' + '<svg ...>...</svg>';
          guidesEl.appendChild(a);
        });
      }

      resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    document.getElementById('quiz-restart').addEventListener('click', function() {
      currentQ = 0;
      answers = new Array(QUESTIONS.length).fill(-1);
      cardEl.style.display = '';
      resultsEl.style.display = 'none';
      render();
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    render();
  })();
  </script>
</body>
</html>
```

### 5.2 Per-Guide Quiz -- `views/pages/guide-quiz.ejs`

Full template (351 lines):

```html
<!DOCTYPE html><html lang="<%= lang %>">
<head>
  <%- include('../partials/head') %>
  <% if (typeof extraCss !== 'undefined') { extraCss.forEach(function(css) { %>
  <link rel="stylesheet" href="/<%= css %>">
  <% }); } %>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Quiz",
    "name": "<%= pageTitle %>",
    "url": "<%= canonicalBase %><%= langPrefix %>/guides/<%= pageSlug %>/quiz",
    "description": "<%= pageDescription %>",
    "isPartOf": { "@type": "TechArticle", "name": "<%= pageTitle %>", "url": "<%= canonicalBase %><%= langPrefix %>/guides/<%= pageSlug %>" },
    "publisher": {
      "@type": "Organization",
      "name": "PENGER",
      "logo": { "@type": "ImageObject", "url": "<%= canonicalBase %>/PENGER.svg" }
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "<%= lang === 'uk' ? 'Головна' : 'Home' %>", "item": "<%= canonicalBase %><%= langPrefix %>/" },
      { "@type": "ListItem", "position": 2, "name": "<%= lang === 'uk' ? 'Академія' : 'Academy' %>", "item": "<%= canonicalBase %><%= langPrefix %>/guides" },
      { "@type": "ListItem", "position": 3, "name": "<%= pageTitle.replace(' Quiz -- PENGER Academy', '').replace(' -- Академія PENGER', '').replace('Квіз: ', '') %>", "item": "<%= canonicalBase %><%= langPrefix %>/guides/<%= pageSlug %>" },
      { "@type": "ListItem", "position": 4, "name": "<%= lang === 'uk' ? 'Квіз' : 'Quiz' %>" }
    ]
  }
  </script>
</head>
<body>
  <%- include('../partials/gtm-body') %>
  <noscript><p style="padding:40px;text-align:center;font-size:16px;">JavaScript is required.</p></noscript>
  <%- include('../partials/header') %>

  <main>
    <% var gq = (typeof t !== 'undefined' && t.guideQuiz) ? t.guideQuiz : {}; %>
    <section class="quiz-hero">
      <div class="container">
        <a href="<%= langPrefix %>/guides/<%= pageSlug %>" class="quiz-back-link">
          <svg ...><path d="M16 10H4M8 5l-5 5 5 5"/></svg>
          <%= gq.backToGuide || 'Back to Guide' %>
        </a>
        <p class="label"><%= gq.heroLabel || '[ QUIZ ]' %></p>
        <h1 class="quiz-hero-title"><%= gq.heroTitle || 'Test Your Knowledge' %></h1>
        <p class="quiz-hero-desc"><%= gq.heroDesc || '5 questions to check your understanding.' %></p>

        <div class="level-toggle" id="levelToggle" style="margin-top:20px;">
          <div class="pill-group">
            <button class="pill active" data-level="beginner" type="button"><%= gq.levelBeginner || 'BEGINNER' %></button>
            <button class="pill" data-level="advanced" type="button"><%= gq.levelAdvanced || 'ADVANCED' %></button>
          </div>
        </div>
      </div>
    </section>

    <section class="quiz-container">
      <div class="container">
        <!-- QUIZ BODY -->
        <div class="quiz-card" id="quiz-card">
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" id="quiz-progress-fill"></div>
          </div>
          <div class="quiz-question-area" id="quiz-question-area">
            <div class="quiz-question-header">
              <span class="quiz-question-counter" id="quiz-counter"></span>
            </div>
            <p class="quiz-question-text" id="quiz-question-text"></p>
            <div class="quiz-options" id="quiz-options"></div>
          </div>
          <div class="quiz-nav" id="quiz-nav">
            <button class="cb-btn cb-btn--secondary" id="quiz-prev" disabled>
              <svg ...>...</svg> <%= gq.back || 'Back' %>
            </button>
            <button class="cb-btn cb-btn--primary" id="quiz-next" disabled>
              <%= gq.next || 'Next' %> <svg ...>...</svg>
            </button>
          </div>
        </div>

        <!-- RESULTS -->
        <div class="quiz-results" id="quiz-results" style="display:none;">
          <div class="quiz-results-header">
            <div class="quiz-score-circle" id="quiz-score-circle">
              <span class="quiz-score-num" id="quiz-score-num"></span>
              <span class="quiz-score-label" id="quiz-score-label"></span>
            </div>
            <div>
              <h2 class="quiz-results-title" id="quiz-results-title"></h2>
              <p class="quiz-results-desc" id="quiz-results-desc"></p>
            </div>
          </div>
          <div class="quiz-results-guides" id="quiz-results-guides"></div>
          <div class="quiz-results-actions">
            <button class="cb-btn cb-btn--secondary" id="quiz-restart"><%= gq.retake || 'Retake Quiz' %></button>
            <button class="cb-btn cb-btn--secondary" id="quiz-switch-level" style="display:none;"></button>
            <a href="<%= langPrefix %>/guides/<%= pageSlug %>" class="cb-btn cb-btn--secondary"><%= gq.backToGuide || 'Back to Guide' %></a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <%- include('../partials/footer') %>

  <script src="/analytics.js"></script>
  <script src="/shared.js?v=3"></script>
  <% if (typeof extraJs !== 'undefined') { extraJs.forEach(function(js) { %>
  <script src="/<%= js %>"></script>
  <% }); } %>
  <script>
  (function() {
    var isUk = '<%= lang %>' === 'uk';
    var LP = '<%= langPrefix %>';
    var SLUG = '<%= pageSlug %>';
    var L = {
      back: isUk ? '<%= gq.back || "Назад" %>' : 'Back',
      next: isUk ? '<%= gq.next || "Далі" %>' : 'Next',
      seeResults: isUk ? '<%= gq.seeResults || "Результати" %>' : 'See Results',
      of: isUk ? '<%= gq.of || "з" %>' : 'of',
      recommended: isUk ? '<%= gq.recommendedSections || "Рекомендовані розділи:" %>' : 'Recommended sections:',
      rereadSection: isUk ? 'Перечитати розділ' : 'Re-read this section',
      excellentTitle: isUk ? 'Чудовий результат!' : 'Excellent Result!',
      excellentDesc: isUk ? 'Ви відповіли правильно на всі запитання...' : 'You answered all questions correctly...',
      excellentAdvice: isUk ? 'Продовжуйте поглиблювати знання...' : 'Continue deepening your knowledge...',
      goodTitle: isUk ? 'Хороший результат!' : 'Good Result!',
      goodDesc: isUk ? '...' : '...',
      improvementTitle: isUk ? 'Є над чим попрацювати' : 'Room for Improvement',
      improvementDesc: isUk ? '...' : '...',
      learnTitle: isUk ? 'Саме час навчатись!' : 'Time to Learn!',
      learnDesc: isUk ? '...' : '...',
      tryAdvanced: isUk ? 'Спробувати просунутий рівень' : 'Try Advanced Level',
      tryBeginner: isUk ? 'Спробувати рівень початківця' : 'Try Beginner Level',
      confirmSwitch: isUk ? 'Перемикання рівня скине ваш прогрес. Продовжити?' : 'Switching levels will reset your progress. Continue?'
    };
    var lk = isUk ? 'uk' : 'en';

    var ALL = window.GUIDE_QUIZ_DATA || {};
    var guideQuiz = ALL[SLUG] || { beginner: [], advanced: [] };

    /* --- State --- */
    var currentLevel = 'beginner';
    var params = new URLSearchParams(window.location.search);
    if (params.get('level') === 'advanced') currentLevel = 'advanced';

    var QUESTIONS = guideQuiz[currentLevel] || [];
    var currentQ = 0;
    var answers = new Array(QUESTIONS.length).fill(-1);

    /* --- DOM refs --- */
    var counterEl = document.getElementById('quiz-counter');
    var questionEl = document.getElementById('quiz-question-text');
    var optionsEl = document.getElementById('quiz-options');
    var progressEl = document.getElementById('quiz-progress-fill');
    var prevBtn = document.getElementById('quiz-prev');
    var nextBtn = document.getElementById('quiz-next');
    var cardEl = document.getElementById('quiz-card');
    var resultsEl = document.getElementById('quiz-results');
    var switchBtn = document.getElementById('quiz-switch-level');
    var questionArea = document.getElementById('quiz-question-area');
    var pills = document.querySelectorAll('#levelToggle .pill');

    /* --- Level toggle (confirm before destroying state) --- */
    function setLevel(lvl) {
      currentLevel = lvl;
      QUESTIONS = guideQuiz[currentLevel] || [];
      currentQ = 0;
      answers = new Array(QUESTIONS.length).fill(-1);
      pills.forEach(function(p) {
        p.classList.toggle('active', p.getAttribute('data-level') === lvl);
      });
      cardEl.style.display = '';
      resultsEl.style.display = 'none';
      if (QUESTIONS.length) render();
    }

    pills.forEach(function(p) {
      p.addEventListener('click', function() {
        var newLevel = p.getAttribute('data-level');
        if (newLevel === currentLevel) return;
        var hasAnswers = answers.some(function(a) { return a !== -1; });
        if (hasAnswers && !confirm(L.confirmSwitch)) return;
        setLevel(newLevel);
      });
    });

    /* --- Transition between questions --- */
    function transitionTo(fn) {
      questionArea.classList.add('transitioning');
      setTimeout(function() { fn(); questionArea.classList.remove('transitioning'); }, 150);
    }

    /* --- ARIA-compliant render --- */
    function render() {
      var q = QUESTIONS[currentQ];
      counterEl.textContent = (currentQ + 1) + ' / ' + QUESTIONS.length;
      questionEl.textContent = q.question[lk] || q.question.en;
      questionEl.setAttribute('aria-live', 'polite');
      progressEl.style.width = ((currentQ + 1) / QUESTIONS.length * 100) + '%';

      var opts = q.options[lk] || q.options.en;
      optionsEl.innerHTML = '';
      optionsEl.setAttribute('role', 'radiogroup');
      optionsEl.setAttribute('aria-label', q.question[lk] || q.question.en);
      opts.forEach(function(opt, i) {
        var btn = document.createElement('button');
        btn.className = 'quiz-option' + (answers[currentQ] === i ? ' selected' : '');
        btn.textContent = opt;
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', answers[currentQ] === i ? 'true' : 'false');
        btn.addEventListener('click', function() {
          answers[currentQ] = i;
          render();
        });
        optionsEl.appendChild(btn);
      });

      prevBtn.disabled = currentQ === 0;
      var isLast = currentQ === QUESTIONS.length - 1;
      nextBtn.disabled = answers[currentQ] === -1;
      nextBtn.innerHTML = isLast ? L.seeResults + ' ' + ARROW_SVG : L.next + ' ' + ARROW_SVG;
    }

    prevBtn.addEventListener('click', function() {
      if (currentQ > 0) { currentQ--; transitionTo(render); }
    });

    nextBtn.addEventListener('click', function() {
      if (answers[currentQ] === -1) return;
      if (currentQ < QUESTIONS.length - 1) {
        currentQ++;
        transitionTo(render);
      } else {
        showResults();
      }
    });

    function showResults() {
      cardEl.style.display = 'none';
      resultsEl.style.display = '';

      var score = 0;
      var weak = [];
      QUESTIONS.forEach(function(q, i) {
        if (answers[i] === q.correct) score++;
        else weak.push(q);
      });

      document.getElementById('quiz-score-num').textContent = score;
      document.getElementById('quiz-score-label').textContent = L.of + ' ' + QUESTIONS.length;

      // Result tier assignment based on percentage
      if (score === QUESTIONS.length) { /* Excellent */ }
      else if (score >= Math.ceil(QUESTIONS.length * 0.8)) { /* Good */ }
      else if (score >= Math.ceil(QUESTIONS.length * 0.5)) { /* Improvement */ }
      else { /* Learning */ }

      // Deep-link recommendations to guide sections
      if (weak.length > 0) {
        weak.forEach(function(q) {
          var a = document.createElement('a');
          a.href = LP + '/guides/' + SLUG + '#' + q.sectionId;
          a.className = 'quiz-results-guide';
          a.innerHTML = '<div class="quiz-results-guide-body">' +
            '<span class="quiz-results-guide-title">' + (q.sectionTitle[lk] || q.sectionTitle.en) + '</span>' +
            '<span class="quiz-results-guide-subtitle">' + L.rereadSection + '</span>' +
            '</div>' + ARROW_SVG;
          guidesEl.appendChild(a);
        });
      }

      // Switch-level button (promoted to primary if perfect score)
      var otherLevel = currentLevel === 'beginner' ? 'advanced' : 'beginner';
      if (guideQuiz[otherLevel] && guideQuiz[otherLevel].length > 0) {
        switchBtn.style.display = '';
        switchBtn.textContent = currentLevel === 'beginner' ? L.tryAdvanced : L.tryBeginner;
        switchBtn.className = score === QUESTIONS.length ? 'cb-btn cb-btn--primary' : 'cb-btn cb-btn--secondary';
        switchBtn.onclick = function() { setLevel(otherLevel); };
      }

      resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    document.getElementById('quiz-restart').addEventListener('click', function() {
      currentQ = 0;
      answers = new Array(QUESTIONS.length).fill(-1);
      cardEl.style.display = '';
      resultsEl.style.display = 'none';
      render();
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    if (QUESTIONS.length) render();
  })();
  </script>
</body>
</html>
```

### 5.3 Quiz Banner on `/guides` page -- `views/pages/guides.ejs` (lines 577-622)

Fixed-position bottom banner prompting users to take the main quiz:

```html
<!-- QUIZ SUGGESTION BANNER -->
<div id="quiz-banner" class="quiz-banner" style="display:none;"
     role="dialog" aria-label="<%= lang === 'uk' ? 'Перевірка знань' : 'Knowledge Check' %>">
  <div class="quiz-banner-inner">
    <div class="quiz-banner-body">
      <p class="quiz-banner-title">
        <%= lang === 'uk' ? 'Наскільки добре ви знаєте крипто-безпеку?' : 'How well do you know crypto security?' %>
      </p>
      <p class="quiz-banner-text">
        <%= lang === 'uk'
          ? 'Пройдіть швидкий тест з 8 запитань, щоб визначити прогалини та отримати персоналізовані рекомендації.'
          : 'Take a quick 8-question quiz to identify knowledge gaps and get personalized recommendations.' %>
      </p>
    </div>
    <div class="quiz-banner-actions">
      <a href="<%= langPrefix %>/quiz" class="cb-btn cb-btn--primary" id="quiz-banner-cta">
        <%= lang === 'uk' ? 'Пройти тест' : 'Take the Quiz' %>
      </a>
      <button class="cb-btn cb-btn--secondary" id="quiz-banner-dismiss">
        <%= lang === 'uk' ? 'Не зараз' : 'Not now' %>
      </button>
    </div>
  </div>
</div>

<script>
(function() {
  var STORAGE_KEY = 'penger_quiz_banner_dismissed';
  var banner = document.getElementById('quiz-banner');
  if (!banner) return;

  // Don't show if already dismissed
  try { if (localStorage.getItem(STORAGE_KEY)) return; } catch(e) {}

  // Wait for cookie banner to be dismissed first, then show quiz banner
  function tryShow() {
    var cb = document.getElementById('cb-banner');
    if (cb && cb.style.display !== 'none') {
      setTimeout(tryShow, 1500);
      return;
    }
    setTimeout(function() { banner.style.display = ''; }, 800);
  }
  tryShow();

  document.getElementById('quiz-banner-dismiss').addEventListener('click', function() {
    banner.style.display = 'none';
    try { localStorage.setItem(STORAGE_KEY, Date.now()); } catch(e) {}
  });

  document.getElementById('quiz-banner-cta').addEventListener('click', function() {
    try { localStorage.setItem(STORAGE_KEY, Date.now()); } catch(e) {}
  });
})();
</script>
```

**Behavior:**
- Starts hidden (`display:none`)
- Waits for cookie banner to be dismissed, then appears after 800ms
- Slide-up animation from bottom
- Stores dismissal timestamp in `localStorage` (`penger_quiz_banner_dismissed`)
- Also marked as dismissed when user clicks "Take the Quiz" CTA

### 5.4 Quiz CTA Block Inside Each Guide

Identical block at the bottom of every guide body (16 files: 8 guides x 2 languages):

**English version:**

```html
<section class="guide-quiz-cta">
  <div class="container">
    <div class="quiz-cta-card">
      <div class="quiz-cta-body">
        <p class="quiz-cta-title">Test Your Knowledge</p>
        <p class="quiz-cta-text">Take a quick quiz to check your understanding of this guide.</p>
      </div>
      <a href="<%= langPrefix %>/guides/<%= pageSlug %>/quiz" class="cb-btn cb-btn--primary">Take the Quiz</a>
    </div>
  </div>
</section>
```

**Ukrainian version:**

```html
<section class="guide-quiz-cta">
  <div class="container">
    <div class="quiz-cta-card">
      <div class="quiz-cta-body">
        <p class="quiz-cta-title">Перевірте свої знання</p>
        <p class="quiz-cta-text">Пройдіть короткий квіз, щоб перевірити розуміння цього гайду.</p>
      </div>
      <a href="<%= langPrefix %>/guides/<%= pageSlug %>/quiz" class="cb-btn cb-btn--primary">Пройти квіз</a>
    </div>
  </div>
</section>
```

---

## 6. Quiz Data

**File:** `public/js/guide-quiz-data.js` (1838 lines)

### Data Structure

```js
window.GUIDE_QUIZ_DATA = {
  'guide-slug': {
    beginner: [
      {
        sectionId: 'section-anchor-id',          // Used for deep-link: /guides/slug#sectionId
        sectionTitle: { en: '...', uk: '...' },   // Displayed in recommendations
        question:    { en: '...', uk: '...' },
        options:     { en: [...], uk: [...] },     // Always 4 options
        correct:     0                             // 0-based index of correct answer
      },
      // ... 5 beginner questions total
    ],
    advanced: [
      // ... 5 advanced questions total
    ]
  }
};
```

### Questions Per Guide

| Guide Slug | Beginner | Advanced | Total |
|---|---|---|---|
| `seed-anatomy` | 5 | 5 | 10 |
| `wallet-anatomy` | 5 | 5 | 10 |
| `self-sovereignty` | 5 | 5 | 10 |
| `wallet-comparison` | 5 | 5 | 10 |
| `opsec` | 5 | 5 | 10 |
| `passphrase` | 5 | 5 | 10 |
| `multisig` | 5 | 5 | 10 |
| `hodl` | 5 | 5 | 10 |
| **Total** | **40** | **40** | **80** |

---

## 7. CSS Styles

**File:** `public/style.css`

### Quiz Styles (lines 3409-3618)

```css
/* === QUIZ HERO === */
.quiz-hero {
  padding: 48px 0 24px;
  border-bottom: 1px solid var(--border-default);
}
.quiz-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-dim); text-decoration: none;
  margin-bottom: 20px;
  transition: color 0.15s ease;
}
.quiz-back-link:hover { color: var(--text-accent); }
.quiz-hero-title {
  font-family: var(--font-sans); font-size: 36px; font-weight: 700;
  color: var(--text-accent); line-height: 1.15;
  margin-top: 8px; margin-bottom: 12px;
}
.quiz-hero-desc {
  font-size: 14px; line-height: 1.7; color: var(--text-primary);
  max-width: 560px;
}

/* === QUIZ CARD === */
.quiz-container { padding: 32px 0 48px; }
.quiz-card {
  max-width: 620px; margin: 0 auto;
  background: var(--bg-surface); border: 1px solid var(--border-default);
  border-radius: 10px; overflow: hidden;
  scroll-margin-top: calc(var(--header-h) + 16px);
}
.quiz-progress-bar {
  height: 6px; background: var(--bg-child); width: 100%;
}
.quiz-progress-fill {
  height: 100%; background: var(--text-accent);
  transition: width 0.3s ease; width: 20%;
}
.quiz-question-area {
  padding: 28px 28px 16px;
  transition: opacity 0.15s ease;
}
.quiz-question-area.transitioning { opacity: 0; }
.quiz-question-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
}
.quiz-question-counter {
  font-family: var(--font-mono); font-size: 11px; font-weight: 700;
  color: var(--text-dim);
}
.quiz-question-topic {
  font-family: var(--font-mono); font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  padding: 3px 10px; border-radius: 20px;
  border: 1px solid var(--border-default);
  color: var(--text-label); background: var(--bg-child);
}
.quiz-question-text {
  font-family: var(--font-sans); font-size: 17px; font-weight: 600;
  line-height: 1.55; color: var(--text-accent);
  margin-bottom: 24px;
}

/* === OPTIONS === */
.quiz-options { display: flex; flex-direction: column; gap: 8px; }
.quiz-option {
  display: block; width: 100%; text-align: left;
  padding: 14px 18px; font-family: var(--font-sans); font-size: 13px;
  line-height: 1.5; color: var(--text-primary);
  background: var(--bg-child); border: 1px solid var(--border-default);
  border-radius: 8px; cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.quiz-option:hover {
  border-color: var(--border-active); background: var(--bg-surface-hover);
}
.quiz-option.selected {
  border-color: var(--text-accent); background: var(--bg-surface);
  color: var(--text-accent); font-weight: 600;
}
.quiz-option:focus-visible {
  outline: 2px solid var(--text-accent);
  outline-offset: 2px;
}

/* === NAVIGATION === */
.quiz-nav {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 28px 24px; gap: 12px;
}
.quiz-nav .cb-btn {
  display: inline-flex; align-items: center; gap: 6px;
}
.quiz-nav .cb-btn:disabled {
  opacity: 0.35; cursor: not-allowed;
}

/* === RESULTS === */
.quiz-results {
  max-width: 620px; margin: 0 auto;
  scroll-margin-top: calc(var(--header-h) + 16px);
}
.quiz-results-header {
  display: flex; align-items: center; gap: 24px;
  padding: 28px; background: var(--bg-surface);
  border: 1px solid var(--border-default); border-radius: 10px;
  margin-bottom: 24px;
}
.quiz-score-circle {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 80px; height: 80px; flex-shrink: 0;
  border: 3px solid var(--text-accent); border-radius: 50%;
}
.quiz-score-num {
  font-family: var(--font-mono); font-size: 28px; font-weight: 700;
  color: var(--text-accent); line-height: 1;
}
.quiz-score-label {
  font-family: var(--font-mono); font-size: 10px; color: var(--text-dim);
  margin-top: 2px;
}
.quiz-results-title {
  font-family: var(--font-sans); font-size: 20px; font-weight: 700;
  color: var(--text-accent); margin-bottom: 6px;
}
.quiz-results-desc {
  font-size: 13px; line-height: 1.65; color: var(--text-primary);
}
.quiz-results-heading {
  font-family: var(--font-mono); font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-dim); margin-bottom: 12px;
}
.quiz-results-guide {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; text-decoration: none;
  border: 1px solid var(--border-default); border-radius: 8px;
  background: var(--bg-surface); margin-bottom: 8px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.quiz-results-guide:hover {
  border-color: var(--border-active);
  box-shadow: 0 2px 12px var(--glow);
}
.quiz-results-guide-body { display: flex; flex-direction: column; gap: 2px; }
.quiz-results-guide-title {
  font-family: var(--font-sans); font-size: 14px; font-weight: 600;
  color: var(--text-accent);
}
.quiz-results-guide-subtitle {
  font-family: var(--font-mono); font-size: 10px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-dim);
}
.quiz-results-guide svg { color: var(--text-dim); flex-shrink: 0; }
.quiz-results-guide:hover svg { color: var(--text-accent); }
.quiz-results-all-good {
  font-size: 14px; line-height: 1.65; color: var(--text-primary);
  padding: 16px 20px; background: var(--bg-surface);
  border: 1px solid var(--border-default); border-radius: 8px;
}
.quiz-results-actions {
  display: flex; gap: 10px; margin-top: 24px; flex-wrap: wrap;
}
.quiz-results-actions .cb-btn { text-decoration: none; }

/* === QUIZ BANNER (fixed bottom on /guides) === */
.quiz-banner {
  position: fixed; bottom: 0; left: 0; right: 0;
  z-index: 9998;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-default);
  box-shadow: 0 -4px 24px rgba(0,0,0,0.08);
  padding: 16px 24px;
  animation: quizBannerSlideUp 0.35s ease;
}
@keyframes quizBannerSlideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
.quiz-banner-inner {
  max-width: 800px; margin: 0 auto;
  display: flex; align-items: center; gap: 16px;
}
.quiz-banner-body { flex: 1; min-width: 0; }
.quiz-banner-title {
  font-family: var(--font-sans); font-size: 13px; font-weight: 600;
  color: var(--text-accent); margin-bottom: 3px;
}
.quiz-banner-text {
  font-size: 12px; line-height: 1.4; color: var(--text-label);
}
.quiz-banner-actions {
  display: flex; gap: 8px; flex-shrink: 0;
}

/* === QUIZ CTA (end of each guide) === */
.guide-quiz-cta { margin-top: 40px; padding: 0 0 32px; }
.quiz-cta-card {
  max-width: 620px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 20px 24px;
  background: var(--bg-surface); border: 1px solid var(--border-default);
  border-left: 3px solid var(--text-accent);
  border-radius: 10px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.quiz-cta-card:hover {
  border-color: var(--border-active);
  box-shadow: 0 2px 12px var(--glow);
}
.quiz-cta-body { flex: 1; min-width: 0; }
.quiz-cta-title {
  font-family: var(--font-sans); font-size: 14px; font-weight: 700;
  color: var(--text-accent); margin-bottom: 4px;
}
.quiz-cta-text {
  font-size: 12px; line-height: 1.5; color: var(--text-label);
}
.quiz-cta-card .cb-btn { flex-shrink: 0; text-decoration: none; }

/* === RESPONSIVE === */
@media (max-width: 600px) {
  .quiz-hero-title { font-size: 28px; }
  .quiz-question-area { padding: 20px 20px 12px; }
  .quiz-nav { padding: 12px 20px 20px; }
  .quiz-results-header { flex-direction: column; text-align: center; padding: 24px 20px; }
  .quiz-score-circle { width: 64px; height: 64px; }
  .quiz-score-num { font-size: 22px; }
  .quiz-banner-inner { flex-direction: column; align-items: stretch; gap: 10px; }
  .quiz-banner-actions { justify-content: stretch; }
  .quiz-banner-actions .cb-btn { flex: 1; text-align: center; }
}
@media (max-width: 520px) {
  .quiz-cta-card { flex-direction: column; align-items: stretch; gap: 12px; }
  .quiz-cta-card .cb-btn { text-align: center; }
}
```

### Level Toggle Pill Styles (shared component, lines 160-175)

```css
.pill-group { display: flex; gap: 0; margin-top: 8px; }
.pill {
  font-family: var(--font-mono); font-size: 13px; font-weight: 500;
  padding: 10px 18px; border: 1px solid var(--border-default);
  background: transparent; color: var(--text-dim); cursor: pointer;
  transition: all 0.15s ease; touch-action: manipulation;
}
.pill:first-child { border-radius: 4px 0 0 4px; }
.pill:last-child { border-radius: 0 4px 4px 0; }
.pill:not(:first-child) { border-left: none; }
.pill:hover { color: var(--text-label); background: var(--bg-surface-hover); }
.pill.active {
  color: var(--bg-main); background: var(--text-accent);
  border-color: var(--text-accent);
}
.pill.active + .pill { border-left: 1px solid var(--text-accent); }

.level-toggle { margin-top: 28px; }
```

---

## 8. Localization (i18n)

### English -- `locales/en.json` (lines 1166-1235)

```json
{
  "quiz": {
    "title": "Knowledge Check -- PENGER Academy",
    "metaDescription": "Take a quick 8-question quiz to identify your crypto self-custody knowledge gaps and get personalized guide recommendations.",
    "keywords": "crypto quiz, self-custody test, knowledge check, crypto education, seed phrase quiz, wallet security quiz"
  },
  "guideQuiz": {
    "heroLabel": "[ QUIZ ]",
    "heroTitle": "Test Your Knowledge",
    "heroDesc": "5 questions to check your understanding. Identify sections worth revisiting and get direct links.",
    "levelBeginner": "BEGINNER",
    "levelAdvanced": "ADVANCED",
    "back": "Back",
    "next": "Next",
    "seeResults": "See Results",
    "retake": "Retake Quiz",
    "backToGuide": "Back to Guide",
    "tryAdvanced": "Try Advanced Level",
    "tryBeginner": "Try Beginner Level",
    "of": "of",
    "recommendedSections": "Recommended sections:",
    "excellentTitle": "Excellent Result!",
    "excellentDesc": "You answered all questions correctly. You have a solid understanding of this topic!",
    "excellentAdvice": "Continue deepening your knowledge with the advanced-level content.",
    "goodTitle": "Good Result!",
    "goodDesc": "You have a strong foundation, but a few sections are worth revisiting.",
    "improvementTitle": "Room for Improvement",
    "improvementDesc": "Some concepts need attention. We recommend revisiting the sections below.",
    "learnTitle": "Time to Learn!",
    "learnDesc": "Don't worry -- review the sections below to strengthen your understanding.",
    "seed-anatomy": {
      "title": "Seed Phrase Quiz -- PENGER Academy",
      "metaDescription": "Test your knowledge of BIP39 seed phrases -- entropy, checksums, word selection, storage, and key derivation.",
      "keywords": "seed phrase quiz, BIP39 test, mnemonic quiz, crypto knowledge check"
    },
    "wallet-anatomy": {
      "title": "Wallet Anatomy Quiz -- PENGER Academy",
      "metaDescription": "Test your understanding of crypto wallets -- keys, addresses, transaction signing, HD wallets, and more.",
      "keywords": "crypto wallet quiz, HD wallet test, private key quiz, wallet knowledge check"
    },
    "self-sovereignty": {
      "title": "Self-Sovereignty Quiz -- PENGER Academy",
      "metaDescription": "Test your knowledge of crypto self-sovereignty -- custodial risks, self-custody roadmap, and trust models.",
      "keywords": "self-sovereignty quiz, self-custody test, crypto autonomy quiz"
    },
    "wallet-comparison": {
      "title": "Wallet Types Quiz -- PENGER Academy",
      "metaDescription": "Test your knowledge of wallet types -- hot vs cold, hardware wallets, multisig, air-gapped signing, and MPC.",
      "keywords": "wallet comparison quiz, hardware wallet test, cold storage quiz"
    },
    "opsec": {
      "title": "OpSec Quiz -- PENGER Academy",
      "metaDescription": "Test your operational security knowledge -- threat modeling, digital habits, physical security, and verification.",
      "keywords": "opsec quiz, crypto security test, operational security quiz"
    },
    "passphrase": {
      "title": "Passphrase Quiz -- PENGER Academy",
      "metaDescription": "Test your knowledge of the BIP39 passphrase -- how it works, hidden wallets, entropy analysis, and threat models.",
      "keywords": "passphrase quiz, 25th word test, BIP39 passphrase quiz"
    },
    "multisig": {
      "title": "Multisig Quiz -- PENGER Academy",
      "metaDescription": "Test your multisig knowledge -- configurations, Bitcoin Script, descriptors, Taproot, and key management.",
      "keywords": "multisig quiz, multi-signature test, Bitcoin multisig quiz"
    },
    "hodl": {
      "title": "HODL Quiz -- PENGER Academy",
      "metaDescription": "Test your HODLing knowledge -- DCA, game theory, on-chain metrics, tax implications, and risk management.",
      "keywords": "HODL quiz, long-term holding test, DCA quiz, crypto investment quiz"
    }
  }
}
```

### Ukrainian -- `locales/uk.json` (lines 1166-1235)

```json
{
  "quiz": {
    "title": "Перевірка знань -- Академія PENGER",
    "metaDescription": "Пройдіть швидкий тест з 8 запитань, щоб визначити прогалини в знаннях про крипто-самосуверенітет та отримати персоналізовані рекомендації гайдів.",
    "keywords": "крипто тест, перевірка знань, тест на самосуверенітет, крипто освіта, тест сід-фрази, тест безпека гаманця"
  },
  "guideQuiz": {
    "heroLabel": "[ КВІЗ ]",
    "heroTitle": "Перевірте свої знання",
    "heroDesc": "5 запитань для перевірки розуміння. Визначте розділи, які варто переглянути, та отримайте прямі посилання.",
    "levelBeginner": "ПОЧАТКІВЕЦЬ",
    "levelAdvanced": "ПРОСУНУТИЙ",
    "back": "Назад",
    "next": "Далі",
    "seeResults": "Результати",
    "retake": "Пройти ще раз",
    "backToGuide": "До гайду",
    "tryAdvanced": "Спробувати просунутий рівень",
    "tryBeginner": "Спробувати рівень початківця",
    "of": "з",
    "recommendedSections": "Рекомендовані розділи:",
    "excellentTitle": "Чудовий результат!",
    "excellentDesc": "Ви відповіли правильно на всі запитання. Ви добре розумієте цю тему!",
    "excellentAdvice": "Продовжуйте поглиблювати знання з контентом просунутого рівня.",
    "goodTitle": "Хороший результат!",
    "goodDesc": "У вас міцна база, але кілька розділів варто повторити.",
    "improvementTitle": "Є над чим попрацювати",
    "improvementDesc": "Деякі концепції потребують уваги. Рекомендуємо переглянути розділи нижче.",
    "learnTitle": "Саме час навчатись!",
    "learnDesc": "Не хвилюйтесь -- перегляньте розділи нижче, щоб зміцнити своє розуміння.",
    "seed-anatomy": {
      "title": "Квіз: Сід-фрази -- Академія PENGER",
      "metaDescription": "Перевірте свої знання про сід-фрази BIP39 -- ентропія, контрольні суми, вибір слів, зберігання та деривація ключів.",
      "keywords": "квіз сід-фрази, тест BIP39, тест мнемоніки, перевірка крипто-знань"
    },
    "wallet-anatomy": {
      "title": "Квіз: Анатомія гаманця -- Академія PENGER",
      "metaDescription": "Перевірте розуміння крипто-гаманців -- ключі, адреси, підписання транзакцій, HD-гаманці та інше.",
      "keywords": "квіз крипто-гаманця, тест HD-гаманця, квіз приватних ключів"
    },
    "self-sovereignty": {
      "title": "Квіз: Самосуверенність -- Академія PENGER",
      "metaDescription": "Перевірте знання про крипто-самосуверенність -- ризики кастодіальних сервісів, дорожня карта та моделі довіри.",
      "keywords": "квіз самосуверенності, тест самостійного зберігання"
    },
    "wallet-comparison": {
      "title": "Квіз: Типи гаманців -- Академія PENGER",
      "metaDescription": "Перевірте знання про типи гаманців -- гарячі та холодні, апаратні, мультипідпис, ізольоване підписання, MPC.",
      "keywords": "квіз порівняння гаманців, тест апаратних гаманців"
    },
    "opsec": {
      "title": "Квіз: OpSec -- Академія PENGER",
      "metaDescription": "Перевірте знання з операційної безпеки -- моделювання загроз, цифрові звички, фізична безпека та верифікація.",
      "keywords": "квіз opsec, тест крипто-безпеки"
    },
    "passphrase": {
      "title": "Квіз: Пасфраза -- Академія PENGER",
      "metaDescription": "Перевірте знання про пасфразу BIP39 -- як працює, приховані гаманці, аналіз ентропії та моделі загроз.",
      "keywords": "квіз пасфрази, тест 25-го слова"
    },
    "multisig": {
      "title": "Квіз: Мультипідпис -- Академія PENGER",
      "metaDescription": "Перевірте знання мультипідпису -- конфігурації, Bitcoin Script, дескриптори, Taproot та управління ключами.",
      "keywords": "квіз мультипідпису, тест multi-signature"
    },
    "hodl": {
      "title": "Квіз: HODL -- Академія PENGER",
      "metaDescription": "Перевірте знання HODLінгу -- DCA, теорія ігор, он-чейн метрики, податкові наслідки та управління ризиками.",
      "keywords": "квіз HODL, тест довгострокового утримання"
    }
  }
}
```

---

## 9. Schema.org / SEO Markup

### Main Quiz (`/quiz`)

```json
{
  "@type": "Quiz",
  "name": "Knowledge Check -- PENGER Academy",
  "url": "https://mypenger.com/quiz",
  "description": "...",
  "publisher": { "@type": "Organization", "name": "PENGER" }
}
```

Breadcrumb: Home > Academy > Knowledge Check

### Per-Guide Quiz (`/guides/:slug/quiz`)

```json
{
  "@type": "Quiz",
  "name": "Seed Phrase Quiz -- PENGER Academy",
  "url": "https://mypenger.com/guides/seed-anatomy/quiz",
  "description": "...",
  "isPartOf": { "@type": "TechArticle", "name": "...", "url": ".../guides/seed-anatomy" },
  "publisher": { "@type": "Organization", "name": "PENGER" }
}
```

Breadcrumb: Home > Academy > Guide Title > Quiz

---

## 10. Client-Side Logic

### State Management

Both quiz types use identical state pattern:

```js
var currentQ = 0;                                    // Current question index
var answers = new Array(QUESTIONS.length).fill(-1);  // -1 = unanswered
```

### User Flow

1. User sees question with 4 options
2. Clicking an option sets `answers[currentQ] = i` and re-renders
3. "Next" button enabled only when current question is answered
4. Navigation back preserves previous answers
5. Last question shows "See Results" instead of "Next"
6. Results screen shows score circle + result tier + recommendations
7. "Retake" resets all state and scrolls to top

### Per-Guide Quiz Additional Features

- **Level toggle:** `setLevel(lvl)` resets all state and switches question set
- **Confirmation dialog:** If answers exist, switching levels shows `confirm()` prompt
- **Transition animation:** 150ms opacity fade between questions via `.transitioning` class
- **Deep-link recommendations:** Wrong answers link to `#sectionId` anchors in the guide
- **Cross-level promotion:** Perfect score promotes "Try Advanced" to primary button style

### localStorage

| Key | Value | Where Used |
|---|---|---|
| `penger_quiz_banner_dismissed` | `Date.now()` timestamp | `guides.ejs` banner |

---

## 11. Accessibility

### ARIA Attributes (Per-Guide Quiz)

```html
<div role="radiogroup" aria-label="Question text">
  <button role="radio" aria-checked="true/false">Option</button>
</div>
<p aria-live="polite">Question text (announced on change)</p>
<div role="dialog" aria-label="Knowledge Check">Quiz banner</div>
```

### Keyboard & Visual

- `:focus-visible` outlines on quiz options
- `disabled` states on navigation buttons with `opacity: 0.35`
- Tab order through options and navigation
- Enter/Space to select options

---

## 12. All 88 Questions Reference

### Main Knowledge Check (8 questions)

| # | Topic | Question (EN) | Correct Answer |
|---|---|---|---|
| 1 | seed-anatomy | What standard defines the 2048-word list used for seed phrases? | BIP39 (index 1) |
| 2 | wallet-anatomy | What is the primary function of an HD wallet? | Derive multiple addresses from one seed (index 1) |
| 3 | self-sovereignty | What does "not your keys, not your coins" mean? | Without controlling private keys you don't truly own crypto (index 2) |
| 4 | wallet-comparison | Which wallet type offers the highest security for long-term storage? | Air-gapped hardware wallet (index 2) |
| 5 | opsec | What is the main goal of OpSec in crypto? | Minimize attack surface and protect private keys (index 1) |
| 6 | passphrase | What does the BIP39 passphrase (25th word) do? | Creates a completely different wallet from the same seed (index 1) |
| 7 | multisig | In a 2-of-3 multisig setup, how many keys are needed? | 2 (index 1) |
| 8 | hodl | What is Dollar Cost Averaging (DCA)? | Investing a fixed amount at regular intervals regardless of price (index 1) |

### Per-Guide Questions (80 questions)

See `public/js/guide-quiz-data.js` for the complete bilingual question bank.

**Summary by guide:**

| Guide | Beginner Section IDs | Advanced Section IDs |
|---|---|---|
| seed-anatomy | b-what-is, b-how-chosen, b-order, b-checksum, b-storage | a-entropy, a-checksum, a-derivation, a-wordlist, a-attacks |
| wallet-anatomy | b-what-wallet, b-keys, b-addresses, b-signing, b-hd-wallets | a-bip32, a-ecdsa, a-xpub, a-utxo, a-address-types |
| self-sovereignty | b-what-is, b-why-matters, b-custodial-risks, b-roadmap, b-responsibility | a-trust, a-node, a-privacy, a-tracking, a-layers |
| wallet-comparison | b-hot-cold, b-hardware, b-custody, b-choosing, b-hw-checklist | a-multisig, a-airgap, a-mpc, a-secure-elements, a-airgap |
| opsec | b-what-opsec, b-threats, b-digital, b-physical, b-social | a-footprint, a-ceremony, a-defense, a-inheritance, a-verification |
| passphrase | b-what-is, b-how-works, b-hidden-wallets, b-risks, b-risks | a-cryptographic, a-entropy-analysis, a-implementation, a-advanced-strategies, a-threat-model |
| multisig | b-what-is, b-why, b-configs, b-setup, b-setup | a-scripts, a-descriptors, a-taproot, a-key-management, a-collaborative |
| hodl | b-what-is, b-why-hodl, b-vs-trading, b-psychology, b-mistakes | a-game-theory, a-dca, a-tax, a-on-chain, a-risk |
